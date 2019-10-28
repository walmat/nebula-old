/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */
import AbortController from 'abort-controller';
import HttpsProxyAgent from 'https-proxy-agent';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';
import { filter, every, some, sortBy } from 'lodash';

import { capitalizeFirstLetter, waitForDelay, getRandomIntInclusive } from '../../common';
import getHeaders from '../utils';
import { Manager, Runner } from '../../constants';
import { Monitor, TaskRunner } from '../utils/constants';

const { Events: TaskManagerEvents } = Manager;
const { Events } = Runner;
const { Types } = TaskRunner;
const { States, DelayTypes, ParseType, ErrorCodes } = Monitor;

// SUPREME
export default class MonitorPrimitive {
  constructor(context, proxy, type = ParseType.Keywords) {
    this.ids = [context.id];
    this._idReserve = [];
    this._task = context.task;
    this.taskIds = [context.taskId];
    this.proxy = proxy;
    this._jar = context.jar;
    this._events = context.events;
    this._logger = context.logger;
    this._parseType = type;

    this._aborter = new AbortController();
    this._signal = this._aborter.signal;

    // eslint-disable-next-line global-require
    const _request = require('fetch-cookie')(fetch, context.jar);
    this._request = defaults(_request, this._task.site.url, {
      timeout: 15000, // to be overridden as necessary
      signal: this._aborter.signal, // generic abort signal
    });
    this._delayer = null;

    this._state = States.PARSE;
    this._prevState = States.PARSE;

    const p = proxy ? new HttpsProxyAgent(proxy.proxy) : null;

    if (p) {
      p.options.maxSockets = Infinity;
      p.options.maxFreeSockets = Infinity;
      p.options.keepAlive = true;
      p.maxFreeSockets = Infinity;
      p.maxSockets = Infinity;
    }

    this._context = {
      ...context,
      proxy: p,
      rawProxy: proxy ? proxy.raw : 'localhost',
      aborter: this._aborter,
      delayer: this._delayer,
      signal: this._aborter.signal,
      request: this._request,
      jar: this._jar,
      logger: this._logger,
    };

    this._history = [];
    this._previousProxy = '';
    this._checkingStock = false;

    this._events.on(TaskManagerEvents.ChangeDelay, this._handleDelay, this);
  }

  _handleAbort(id) {
    if (this.ids.some(i => i === id)) {
      this.ids = this.ids.filter(i => i !== id);

      if (!this.ids.length) {
        this._context.aborted = true;
        this._aborter.abort();
        if (this._delayer) {
          this._delayer.clear();
        }
      }
    }
  }

  _handleDelay(id, delay, type) {
    if (this.ids.some(i => i === id)) {
      if (type === DelayTypes.error) {
        this._context.task.errorDelay = delay;
      } else if (type === DelayTypes.monitor) {
        this._context.task.monitorDelay = delay;
      }
      if (this._delayer) {
        this._delayer.clear();
      }
    }
  }

  async _handleParsingErrors(errors) {
    if (this._context.aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { monitorDelay } = this._context.task;
    let ban = false; // assume we have a ban
    errors.forEach(({ status }) => {
      if (!status) {
        return;
      }

      if (
        (!/(?!([235][0-9]))\d{3}/g.test(status) || /ECONNRESET|ENOTFOUND/.test(status)) &&
        status !== ErrorCodes.ProductNotFound &&
        ErrorCodes.NoStylesFound &&
        ErrorCodes.VariantNotFound
      ) {
        // 400+ status code or connection error
        ban = true;
      }
    });

    if (ban) {
      this._logger.silly('Proxy was banned, swapping proxies...');
      this._emitMonitorEvent({ message: 'Proxy banned!', rawProxy: this._context.rawProxy });
      return States.SWAP;
    }

    this._emitMonitorEvent({
      message: `No product found. Delaying ${monitorDelay}ms`,
      rawProxy: this._context.rawProxy,
    });
    this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
    await this._delayer;
    return this._prevState;
  }

  _cleanup() {
    console.log(this._history);
  }

  async swapProxies() {
    // emit the swap event

    // index 0 will always be the origination task.. so let's use that to swap
    this._events.emit(Events.SwapMonitorProxy, this.ids[0], this.proxy);
    return new Promise((resolve, reject) => {
      let timeout;
      const proxyHandler = (id, proxy) => {
        this._logger.silly('Reached Proxy Handler, resolving');
        // clear the timeout interval
        clearTimeout(timeout);
        // reset the timeout
        timeout = null;
        // finally, resolve with the new proxy
        resolve(proxy);
      };
      timeout = setTimeout(() => {
        this._events.removeListener(Events.ReceiveProxy, proxyHandler);
        this._logger.silly('Reached Proxy Timeout: should reject? %s', !!timeout);
        // only reject if timeout has not been cleared
        if (timeout) {
          reject(new Error('Timeout'));
        }
      }, 10000); // TODO: Make this a variable delay?
      this._events.once(Events.ReceiveProxy, proxyHandler);
    });
  }

  // MARK: Event Registration
  registerForEvent(event, callback) {
    switch (event) {
      case Events.MonitorStatus: {
        this._events.on(Events.MonitorStatus, callback);
        break;
      }
      default:
        break;
    }
  }

  deregisterForEvent(event, callback) {
    switch (event) {
      case Events.MonitorStatus: {
        this._events.removeListener(Events.MonitorStatus, callback);
        break;
      }
      default: {
        break;
      }
    }
  }

  _emitEvent(event, payload) {
    switch (event) {
      // Emit supported events on their specific channel
      case Events.MonitorStatus: {
        this._events.emit(event, this.ids[0], payload, event);
        break;
      }
      default: {
        break;
      }
    }
    this._logger.silly('Event %s emitted: %j', event, payload);
  }

  _emitMonitorEvent(payload = {}) {
    this._logger.debug('PAYLOAD: %j', payload);
    if (payload.message && payload.message !== this._context.status) {
      this._status = payload.message;
      this._emitEvent(Events.MonitorStatus, { ...payload, type: Types.Normal });
    }
  }

  static async filterAndLimit(list, sorter, limit, logger) {
    const _logger = logger || { log: () => {} };
    _logger.log('silly', 'Filtering given list with sorter: %s and limit: %d ...', sorter, limit);
    if (!list) {
      _logger.log('silly', 'No list given! returning empty list');
      return [];
    }
    _logger.log(
      'silly',
      'List Detected with %d elements. Proceeding to sorting now...',
      list.length,
    );
    let sorted = list;
    if (sorter) {
      _logger.log('silly', 'Sorter detected, sorting...');
      sorted = sortBy(list, sorter);
    }

    const _limit = limit || 0;
    if (_limit === 0) {
      _logger.log('silly', 'No limit given! returning...');
      return sorted;
    }
    if (_limit > 0) {
      _logger.log('silly', 'Ascending Limit detected, limiting...');
      return sorted.slice(_limit);
    }
    _logger.log('silly', 'Descending Limit detected, limiting...');
    // slice, then reverse elements to get the proper order
    return sorted.slice(0, _limit).reverse();
  }

  async matchKeywords(products, keywords, _filter, logger, returnAll = false) {
    const _logger = logger || { log: () => {} };
    _logger.log(
      'silly',
      'Starting keyword matching for keywords: %s',
      JSON.stringify(keywords, null, 2),
      keywords,
    );
    if (!products) {
      _logger.log('silly', 'No product list given! Returning null');
      return null;
    }
    if (!keywords) {
      _logger.log('silly', 'No keywords object given! Returning null');
      return null;
    }
    if (!keywords.pos || !keywords.neg) {
      _logger.log('silly', 'Malformed keywords object! Returning null');
      return null;
    }

    const matches = filter(products, product => {
      const name = product.name.toUpperCase();

      // defaults
      let pos = true;
      let neg = false;

      if (keywords.pos.length) {
        pos = every(
          keywords.pos.map(k => k.toUpperCase()),
          keyword => name.indexOf(keyword.toUpperCase()) > -1,
        );
      }

      if (keywords.neg.length) {
        neg = some(keywords.neg.map(k => k.toUpperCase()), keyword => name.indexOf(keyword) > -1);
      }

      return pos && !neg;
    });

    if (!matches || (matches && !matches.length)) {
      _logger.log(
        'silly',
        'Searched %d products. No matches found! Returning null',
        products.length,
      );
      return null;
    }

    if (matches.length > 1) {
      let filtered;
      _logger.log(
        'silly',
        'Searched %d products. %d Products Found',
        products.length,
        matches.length,
        JSON.stringify(matches.map(({ name }) => name), null, 2),
      );
      if (_filter && _filter.sorter && _filter.limit) {
        _logger.log('silly', 'Using given filtering heuristic on the products...');
        let { limit } = _filter;
        if (returnAll) {
          _logger.log('silly', "Overriding filter's limit and returning all products...");
          limit = 0;
        }
        filtered = await MonitorPrimitive.filterAndLimit(
          matches,
          _filter.sorter,
          limit,
          this._logger,
        );
        if (!returnAll) {
          _logger.log('silly', 'Returning Matched Product: %s', filtered[0].name);
          return filtered[0];
        }
        _logger.log('silly', 'Returning %d Matched Products', filtered.length);
        return filtered;
      }
      _logger.log(
        'silly',
        'No Filter or Invalid Filter Heuristic given! Defaulting to most recent...',
      );
      if (returnAll) {
        _logger.log('silly', 'Returning all products...');
        filtered = await MonitorPrimitive.filterAndLimit(matches, 'position', 0, this._logger);
        _logger.log('silly', 'Returning %d Matched Products', filtered);
        return filtered;
      }
      filtered = await MonitorPrimitive.filterAndLimit(matches, 'position', -1, this._logger);
      _logger.log('silly', 'Returning Matched Product: %s', filtered[0].name);
      return filtered[0];
    }
    _logger.log(
      'silly',
      'Searched %d products. Matching Product Found: %s',
      products.length,
      matches[0].name,
    );
    return returnAll ? matches : matches[0];
  }

  static async matchVariation(variations, variation, logger = { log: () => {} }) {
    if (/random/i.test(variation)) {
      const rand = getRandomIntInclusive(0, variations.length - 1);
      const variant = variations[rand];
      return variant;
    }

    return variations.find(v => {
      const { name } = v;
      let variationMatcher;
      if (/[0-9]+/.test(name)) {
        // We are matching a shoe size
        variationMatcher = s => new RegExp(`${name}`, 'i').test(s);
      } else {
        // We are matching a garment size
        variationMatcher = s => !/[0-9]+/.test(s) && new RegExp(`^${name}`, 'i').test(s.trim());
      }

      if (variationMatcher(variation)) {
        logger.log('debug', 'Choosing variant: %j', v);
        return v;
      }
    });
  }

  async _handleSwapProxies() {
    const {
      task: { errorDelay },
      rawProxy,
    } = this._context;
    try {
      this._logger.silly('Waiting for new proxy...');
      const proxy = await this.swapProxies();

      this._logger.debug('PROXY IN _handleSwapProxies: %j', proxy);
      // Proxy is fine, update the references
      if ((proxy || proxy === null) && this._previousProxy !== null) {
        if (proxy === null) {
          this._previousProxy = this._context.proxy;
          this.proxy = proxy; // null
          this._context.proxy = proxy; // null
          this._context.rawProxy = 'localhost';
          this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
          this._emitMonitorEvent({
            message: `Swapped proxy to: localhost`,
            rawProxy: this._context.rawProxy,
          });
        } else {
          this._previousProxy = this._context.proxy;
          this.proxy = proxy;
          const p = proxy ? new HttpsProxyAgent(proxy.proxy) : null;

          if (p) {
            p.options.maxSockets = Infinity;
            p.options.maxFreeSockets = Infinity;
            p.options.keepAlive = true;
            p.maxFreeSockets = Infinity;
            p.maxSockets = Infinity;
          }
          this._context.proxy = p;
          this._context.rawProxy = proxy.raw;
          this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
          this._emitMonitorEvent({
            message: `Swapped proxy to: ${proxy.raw}`,
            rawProxy: proxy.raw,
          });
        }
        this._logger.debug('Rewinding to state: %s', this._prevState);
        return this._prevState;
      }

      this._emitMonitorEvent({
        message: `No open proxy! Delaying ${errorDelay}ms`,
        rawProxy,
      });
      // If we get a null proxy back, there aren't any available. We should wait the error delay, then try again
      this._delayer = waitForDelay(errorDelay, this._aborter.signal);
      await this._delayer;
      this._emitMonitorEvent({ message: 'Proxy banned!', rawProxy });
    } catch (err) {
      this._logger.verbose('Swap Proxies Handler completed with errors: %s', err, err);
      this._emitMonitorEvent({
        message: 'Error swapping proxies! Retrying...',
        rawProxy,
      });
    }
    // Go back to previous state
    return this._prevState;
  }

  async _handleParse() {
    const { aborted, task, proxy, rawProxy, logger } = this._context;
    const { product, category } = task;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    this._emitMonitorEvent({ message: 'Parsing products', rawProxy });

    try {
      const res = await this._request('/mobile_stock.json', {
        method: 'GET',
        agent: proxy,
        headers: getHeaders(),
      });

      if (!res.ok) {
        const error = new Error('Error parsing products');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();

      const { products_and_categories: productsAndCategories } = body;

      if (!productsAndCategories) {
        return States.PARSE;
      }

      const productsInCategory = productsAndCategories[category];

      this._logger.silly(
        'Supreme Monitor: Parsed %d products in category: %s',
        productsInCategory ? productsInCategory.length : 0,
        category,
      );

      if (!productsInCategory || (productsInCategory && !productsInCategory.length)) {
        return States.PARSE;
      }

      const keywords = {
        pos: product.pos_keywords,
        neg: product.neg_keywords,
      };

      const matchedProduct = await this.matchKeywords(productsInCategory, keywords, null, logger); // no need to use a custom filter at this point...

      if (!matchedProduct) {
        this._logger.silly('Supreme Monitor: Unable to find matching product!');
        const error = new Error('Product Not Found');
        error.status = ErrorCodes.ProductNotFound;
        throw error;
      }

      this._context.task.product.name = capitalizeFirstLetter(matchedProduct.name);
      this._context.task.product.price = matchedProduct.price;
      this._context.task.product.style = matchedProduct.id;

      this._logger.silly('Supreme Monitor: Product found: %j', matchedProduct.name);

      return States.STOCK;
    } catch (error) {
      return this._handleParsingErrors([error]);
    }
  }

  async _handleStock() {
    const { aborted, task, proxy, rawProxy, logger } = this._context;
    const {
      product: { variation, style },
    } = task;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (!this._checkingStock) {
      this._emitMonitorEvent({ message: 'Fetching stock', rawProxy });
    }

    try {
      const res = await this._request(`/shop/${style}.json`, {
        method: 'GET',
        agent: proxy,
        headers: getHeaders(),
      });

      if (!res.ok) {
        const error = new Error('Error fetching stock');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();
      const { styles } = body;
      if (!styles || (styles && !styles.length)) {
        const error = new Error('No Product Styles');
        error.status = 404;
        throw error;
      }

      const matchedVariation = await MonitorPrimitive.matchVariation(styles, variation, logger);

      if (!matchedVariation) {
        this._emitMonitorEvent({ message: 'No variation matched!', rawProxy });
        return States.ERROR;
      }

      this._context.task.product.id = matchedVariation.id;
      this._context.task.product.variants = matchedVariation.sizes;
      this._context.task.product.currency = matchedVariation.currency;
      this._context.task.product.image = matchedVariation.image_url;
      this._context.task.product.chosenVariation = matchedVariation.name;

      this._events.emit(
        TaskManagerEvents.ProductFound,
        this.ids,
        this._context.task.product,
        this._parseType,
      );

      const { name } = this._context.task.product;
      if (!this._checkingStock) {
        this._emitMonitorEvent({
          message: `Product found: ${name}`,
          found: name || undefined,
          rawProxy,
        });
      }
      return States.DONE;
    } catch (error) {
      return this._handleParsingErrors([error]);
    }
  }

  async _handleDone() {
    if (this._context.aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    this._events.emit(
      TaskManagerEvents.ProductFound,
      this.ids,
      this._context.task.product,
      this._parseType,
    );

    this._delayer = waitForDelay(1000, this._aborter.signal);
    await this._delayer;
    this._checkingStock = true;

    return States.STOCK;
  }

  async _handleError() {
    this._events.emit(TaskManagerEvents.Abort, this.ids);
    return States.ABORT;
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    this._logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.PARSE]: this._handleParse,
      [States.STOCK]: this._handleStock,
      [States.SWAP]: this._handleSwapProxies,
      [States.ERROR]: this._handleError,
      [States.DONE]: this._handleDone,
      [States.ABORT]: () => States.ABORT,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }

  // MARK: State Machine Run Loop
  async run() {
    let nextState = this._state;

    if (this._context.aborted || this._context.productFound) {
      nextState = States.ABORT;
      return true;
    }

    try {
      nextState = await this._handleStepLogic(this._state);
    } catch (e) {
      if (!/aborterror/i.test(e.name)) {
        this._logger.verbose('Monitor loop errored out! %s', e);
        nextState = States.ERROR;
      }
    }
    this._logger.debug('Monitor Loop finished, state transitioned to: %s', nextState);

    if (this._state !== nextState) {
      // this._history.push(this._state);
      this._prevState = this._state;
      this._state = nextState;
    }

    if (nextState === States.ABORT) {
      return true;
    }

    return false;
  }

  async start() {
    let shouldStop = false;

    while (this._state !== States.ABORT && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.run();
    }

    this._cleanup();
  }
}
