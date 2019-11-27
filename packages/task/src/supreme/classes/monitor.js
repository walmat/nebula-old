/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */
import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

import { capitalizeFirstLetter, waitForDelay } from '../../common';
import getHeaders, { matchKeywords, matchVariation } from '../utils';
import { Task as TaskContants, Platforms } from '../../constants';
import { Monitor } from '../utils/constants';

const { States } = Monitor;

const { Types, Events, ErrorCodes } = TaskContants;

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

  get delayer() {
    return this._delayer;
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
    this._prevState = this._state;
    this._checkingStock = false;
  }

  // MARK: Handler functions

  async _handleError(error = {}, state) {
    const { aborted, logger } = this._context;
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { status } = error;

    logger.error('Handling error with status: %j', status);

    if (!status) {
      return state;
    }

    if (/aborterror/i.test(status)) {
      return States.ABORT;
    }

    const match = /(ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT|ENOTFOUND|ECONNREFUSED|EPROTO)/.exec(
      status,
    );

    if (match) {
      // Check capturing group
      switch (match[1]) {
        case 'ENOTFOUND':
        case 'EPROTO':
        case 'ECONNREFUSED':
        case 'ECONNRESET': {
          return {
            message: 'Proxy banned!',
            nextState: States.SWAP,
          };
        }
        default:
          break;
      }
    } else if (/(?!([235][0-9]))\d{3}/g.test(status)) {
      this._emitMonitorEvent({
        message: `${status}! Delaying ${this._context.task.errorDelay}ms (${status})`,
      });
      this._delayer = waitForDelay(this._context.task.errorDelay, this._aborter.signal);
      await this._delayer;
    } else if (
      status === ErrorCodes.ProductNotFound ||
      status === ErrorCodes.NoStylesFound ||
      status === ErrorCodes.VariantNotFound
    ) {
      this._emitMonitorEvent({
        message: `${status}! Delaying ${this._context.task.monitorDelay}ms`,
      });
      this._delayer = waitForDelay(this._context.task.monitorDelay, this._aborter.signal);
      await this._delayer;
    }
    return state;
  }

  async swapProxies() {
    const { id, proxy, task, logger, proxyManager } = this._context;
    const proxyId = proxy ? proxy.id : null;
    logger.debug('Swapping proxy with id: %j', proxyId);
    const newProxy = await proxyManager.swap(id, proxyId, task.site.url, this._platform);
    logger.debug('Received new proxy: %j', newProxy ? newProxy.proxy : null);
    return newProxy;
  }

  // eslint-disable-next-line class-methods-use-this
  _cleanup() {}

  // MARK: Event Registration
  registerForEvent(event, callback) {
    const { events } = this._context;
    events.on(event, callback);
  }

  deregisterForEvent(event, callback) {
    const { events } = this._context;
    events.removeListener(event, callback);
  }

  _emitEvent(event, payload) {
    const { ids, logger, events } = this._context;
    events.emit(event, ids, payload, event);
    logger.silly('Event %s emitted: %j', event, payload);
  }

  _emitMonitorEvent(payload = {}) {
    const { message } = payload;
    if (message && message !== this._context.message) {
      this._context.setMessage(message);
      this._emitEvent(Events.MonitorStatus, { ...payload, type: Types.Normal });
    }
  }

  async _handleSwapProxies() {
    const {
      task: { errorDelay },
      logger,
    } = this._context;
    try {
      logger.silly('Waiting for new proxy...');
      const proxy = await this.swapProxies();

      logger.debug('Proxy in _handleSwapProxies: %j', proxy);
      // Proxy is fine, update the references
      if ((proxy || proxy === null) && this._context.proxy !== proxy) {
        this._context.setLastProxy(this._context.proxy);
        this._context.setProxy(proxy);

        logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
        this._emitMonitorEvent({
          message: `Swapped proxy to: ${proxy ? proxy.raw : 'localhost'}`,
        });

        logger.debug('Rewinding to state: %s', this._prevState);
        return this._prevState;
      }

      // If we get a null proxy back while our previous proxy was also null.. then there aren't any available
      // We should wait the error delay, then try again
      this._emitMonitorEvent({
        message: `No open proxy! Delaying ${errorDelay}ms`,
      });
      this._delayer = waitForDelay(errorDelay, this._aborter.signal);
      await this._delayer;
    } catch (error) {
      logger.error('Swap Proxies Handler completed with errors: %s', error.toString());
      this._emitMonitorEvent({ message: 'Error swapping proxies! Retrying' });
    }
    // Go back to previous state
    return this._prevState;
  }

  async _handleParse() {
    const { aborted, task, proxy, logger } = this._context;
    const { product, category } = task;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    this._emitMonitorEvent({ message: 'Parsing products' });

    try {
      const res = await this._fetch('/mobile_stock.json', {
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

      logger.silly(
        'Supreme Monitor: Parsed %d products in category: %s',
        productsInCategory ? productsInCategory.length : 0,
        category,
      );

      if (!productsInCategory || (productsInCategory && !productsInCategory.length)) {
        logger.silly('Supreme Monitor: Unable to find matching product!');
        const error = new Error('Product Not Found');
        error.status = ErrorCodes.ProductNotFound;
        throw error;
      }

      const keywords = {
        pos: product.pos_keywords,
        neg: product.neg_keywords,
      };

      const matchedProduct = await matchKeywords(productsInCategory, keywords, null, logger); // no need to use a custom filter...

      if (!matchedProduct) {
        logger.silly('Supreme Monitor: Unable to find matching product!');
        const error = new Error('Product Not Found');
        error.status = ErrorCodes.ProductNotFound;
        throw error;
      }

      this._context.task.product.name = capitalizeFirstLetter(matchedProduct.name);
      this._context.task.product.price = matchedProduct.price;
      this._context.task.product.style = matchedProduct.id;

      logger.silly('Supreme Monitor: Product found: %j', matchedProduct.name);

      return States.STOCK;
    } catch (error) {
      return this._handleError(error, States.PARSE);
    }
  }

  async _handleStock() {
    const { task, aborted, proxy, logger } = this._context;
    const {
      product: { variation, style },
    } = task;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (!this._checkingStock) {
      this._emitMonitorEvent({ message: 'Fetching stock' });
    }

    try {
      const res = await this._fetch(`/shop/${style}.json`, {
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
        this._emitMonitorEvent({ message: 'No variation matched!' });
        return States.ABORT;
      }

      task.product.id = matchedVariation.id;
      task.product.variants = matchedVariation.sizes;
      task.product.currency = matchedVariation.currency;
      task.product.image = matchedVariation.image_url;
      task.product.chosenVariation = matchedVariation.name;

      const { name } = task.product;
      this._emitMonitorEvent({ message: `Product found: ${name}` });
      return States.DONE;
    } catch (error) {
      return this._handleError(error, States.STOCK);
    }
  }

  async _handleStepLogic(currentState) {
    const { logger } = this._context;
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.PARSE]: this._handleParse,
      [States.STOCK]: this._handleStock,
      [States.SWAP]: this._handleSwapProxies,
      [States.DONE]: () => States.ABORT,
      [States.ERROR]: () => States.ABORT,
      [States.ABORT]: () => States.ABORT,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }

  // MARK: State Machine Run Loop
  async loop() {
    let nextState = this._state;

    const { aborted, logger } = this._context;
    if (aborted) {
      nextState = States.ABORT;
      return true;
    }

    try {
      nextState = await this._handleStepLogic(this._state);
    } catch (e) {
      if (!/aborterror/i.test(e.name)) {
        logger.verbose('Monitor errored out! %s', e);
        nextState = States.ABORT;
      }
    }
    logger.debug('Monitor Loop finished, state transitioned to: %s', nextState);

    if (this._state !== nextState) {
      this._prevState = this._state;
      this._state = nextState;
    }

    if (nextState === States.ABORT) {
      return true;
    }

    return false;
  }

  stop(id) {
    const { logger } = this._context;

    if (!this._context.hasId(id)) {
      return;
    }

    logger.debug('Removing id from ids: %s, %j', id, this._context.ids);
    this._context.removeId(id);

    logger.debug('Amount of ids: %d', this._context.ids.length);

    if (!this._context.isEmpty()) {
      this._context.setAborted(true);
      this._aborter.abort();
      if (this._delayer) {
        this._delayer.clear();
      }
    }
  }

  async run() {
    let shouldStop = false;

    do {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.loop();
    } while (this._state !== States.ABORT && !shouldStop);

    this._cleanup();
  }
}
