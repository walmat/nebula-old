/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */
import AbortController from 'abort-controller';
import HttpsProxyAgent from 'https-proxy-agent';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

import { capitalizeFirstLetter, waitForDelay } from '../../common';
import getHeaders, { matchKeywords, matchVariation } from '../utils';
import { Manager, Task, Platforms } from '../../constants';
import { Monitor, Task as TaskContants } from '../utils/constants';

const { Events: TaskManagerEvents } = Manager;
const { Events } = Task;
const { Types } = TaskContants;
const { States, DelayTypes, ErrorCodes } = Monitor;

// SUPREME
export default class MonitorPrimitive {
  get state() {
    return this._state;
  }

  get context() {
    return this._context;
  }

  get platform() {
    return this._platform;
  }

  constructor(context, platform = Platforms.Supreme) {
    this._context = context;
    this._aborter = new AbortController();
    this._signal = this._aborter.signal;
    this._platform = platform;

    // eslint-disable-next-line global-require
    const _fetch = require('fetch-cookie/node-fetch')(fetch, context.jar);
    this._fetch = defaults(_fetch, context.task.site.url, {
      timeout: 15000, // can be overridden as necessary per request
      signal: this._aborter.signal,
    });
    this._delayer = null;

    this._state = States.PARSE;
    this._prevState = States.PARSE;

    this._checkingStock = false;

    this._events.on(TaskManagerEvents.ChangeDelay, this._handleDelay, this);
  }

  // MARK: Handler functions

  _handleAbort(id) {
    if (!this._context.hasId(id)) {
      return;
    }

    this._context.removeId(id);

    if (!this._context.ids.length) {
      this._context.aborted(true);
      this._aborter.abort();
      if (this._delayer) {
        this._delayer.clear();
      }
    }
  }

  _handleDelay(id, delay, type) {
    if (!this._context.hasId(id)) {
      return;
    }

    if (type === DelayTypes.error) {
      this._context.task.errorDelay = delay;
    } else if (type === DelayTypes.monitor) {
      this._context.task.monitorDelay = delay;
    }

    // reset delay to immediately propagate the delay
    if (this._delayer) {
      this._delayer.clear();
    }
  }

  async _handleErrors(errors) {
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
        (/(?!([235][0-9]))\d{3}/g.test(status) || /ECONNRESET|ENOTFOUND/.test(status)) &&
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

  async swapProxies() {
    // index 0 will always be the origination task.. so let's use that to swap
    const { id, proxy } = this._context;
    this._events.emit(Events.SwapMonitorProxy, id, proxy);
    return new Promise((resolve, reject) => {
      let timeout;
      const proxyHandler = (_, newProxy) => {
        this._logger.silly('Reached Proxy Handler, resolving');
        // clear the timeout interval
        clearTimeout(timeout);
        // reset the timeout
        timeout = null;
        // finally, resolve with the new proxy
        resolve(newProxy);
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

  // eslint-disable-next-line class-methods-use-this
  _cleanup() {}

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
        const { ids } = this._context;
        this._events.emit(event, ids, payload, event);
        break;
      }
      default: {
        break;
      }
    }
    this._logger.silly('Event %s emitted: %j', event, payload);
  }

  _emitMonitorEvent(payload = {}) {
    const { message } = payload;
    if (message && message !== this._context.message) {
      this._context.message(message);
      this._emitEvent(Events.MonitorStatus, { ...payload, type: Types.Normal });
    }
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
      if ((proxy || proxy === null) && this._previousProxy !== proxy) {
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

      const matchedProduct = await matchKeywords(productsInCategory, keywords, null, logger); // no need to use a custom filter at this point...

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
      return this._handleErrors([error]);
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

      const matchedVariation = await matchVariation(styles, variation, logger);

      if (!matchedVariation) {
        this._emitMonitorEvent({ message: 'No variation matched!', rawProxy });
        return States.ABORT;
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
  async loop() {
    let nextState = this._state;

    if (this._context.aborted) {
      nextState = States.ABORT;
      return true;
    }

    try {
      nextState = await this._handleStepLogic(this._state);
    } catch (e) {
      if (!/aborterror/i.test(e.name)) {
        this._logger.verbose('Monitor loop errored out! %s', e);
        nextState = States.ABORT;
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

  async run() {
    let shouldStop = false;

    while (this._state !== States.ABORT && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.loop();
    }

    this._cleanup();
  }
}
