import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';
import { pick, isEqual } from 'lodash';
import { getParseType } from '../classes/utils/parse';

const TaskManagerEvents = require('../../constants').Manager.Events;
const { Events } = require('../../constants').Runner;
const { Platforms } = require('../../constants');
const { Parser, getSpecialParser, getParsers } = require('../classes/parsers');
const { rfrl, capitalizeFirstLetter, waitForDelay } = require('../../common');
const {
  Monitor: { States, DelayTypes, ParseType },
  TaskRunner: { Types },
} = require('../classes/utils/constants');
const { ErrorCodes } = require('../classes/utils/constants');

class Monitor {
  constructor(context, proxy, type = ParseType.Unknown) {
    this.id = context.id;
    this._task = context.task;
    this.taskId = context.taskId;
    this.proxy = proxy;
    this._jar = context.jar;
    this._events = context.events;
    this._logger = context.logger;
    this._aborted = context.aborted;
    this._parseType = type;

    this._aborter = new AbortController();
    this._signal = this._aborter.signal;

    // eslint-disable-next-line global-require
    const _request = require('fetch-cookie')(fetch, context.jar);
    this._request = defaults(_request, this._task.site.url, {
      timeout: 120000, // to be overridden as necessary
      signal: this._aborter.signal, // generic abort signal
    });
    this._delayer = null;

    this._state = States.PARSE;
    this._prevState = States.PARSE;
    this.shouldBanProxy = 0;

    this._context = {
      ...context,
      proxy: proxy ? proxy.proxy : null,
      rawProxy: proxy ? proxy.raw : null,
      aborter: this._aborter,
      delayer: this._delayer,
      signal: this._aborter.signal,
      request: this._request,
      jar: this._jar,
      logger: this._logger,
      aborted: this._aborted,
    };

    this._history = [];

    this._handleAbort = this._handleAbort.bind(this);
    this._handleDelay = this._handleDelay.bind(this);

    this._events.on(TaskManagerEvents.ProductFound, this._handleProduct, this);
    this._events.on(TaskManagerEvents.ChangeDelay, this._handleDelay, this);
  }

  _handleDelay(id, delay, type) {
    if (id === this._context.id) {
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

  async _compareProductInput(product, parseType) {
    // we only care about keywords/url matching here...
    switch (parseType) {
      case ParseType.Keywords: {
        const { pos_keywords: posKeywords, neg_keywords: negKeywords } = this._context.task.product;
        const samePositiveKeywords = isEqual(product.pos_keywords.sort(), posKeywords.sort());
        const sameNegativeKeywords = isEqual(product.neg_keywords.sort(), negKeywords.sort());
        return samePositiveKeywords && sameNegativeKeywords;
      }
      case ParseType.Url: {
        const { url } = this._context.task.product;
        return product.url.toUpperCase() === url.toUpperCase();
      }
      default:
        return false;
    }
  }

  async _handleProduct(id, product, parseType) {
    if (parseType === this._parseType) {
      const isSameProductData = await this._compareProductInput(product, parseType);

      if (
        (isSameProductData && !this._context.productFound) ||
        (id === this.id && !this._context.productFound)
      ) {
        this._context.task.product = {
          ...this._context.task.product,
          ...product,
        };

        this._context.productFound = true;
      }
    }
  }

  _handleAbort(id) {
    if (id === this._context.id) {
      this._context.aborted = true;
      this._aborter.abort();
      if (this._delayer) {
        this._delayer.clear();
      }
    }
  }

  _cleanup() {
    console.log(this._history);
  }

  async swapProxies() {
    // emit the swap event
    this._events.emit(Events.SwapMonitorProxy, this.id, this.proxy, this.shouldBanProxy);
    return new Promise((resolve, reject) => {
      let timeout;
      const proxyHandler = (id, proxy) => {
        this._logger.silly('Reached Proxy Handler, resolving');
        // clear the timeout interval
        clearTimeout(timeout);
        // reset the timeout
        timeout = null;
        // reset the ban flag
        this.shouldBanProxy = 0;
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
        this._events.emit(event, this._context.id, payload, event);
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

  async _handleParsingErrors(errors) {
    if (this._context.aborted || this._context.productFound) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { monitorDelay } = this._context.task;
    let delayStatus;
    let ban = true; // assume we have a softban
    errors.forEach(({ status }) => {
      if (!status) {
        return;
      }

      if (!/429|430|ECONNREFUSED|ECONNRESET|ENOTFOUND/.test(status)) {
        // status is neither 429, 430, so set ban to false
        ban = false;
      }

      if (
        !delayStatus &&
        (status === ErrorCodes.ProductNotFound ||
          status === ErrorCodes.ProductNotLive ||
          status === ErrorCodes.PasswordPage ||
          status >= 400)
      ) {
        delayStatus = status; // find the first error that is either a product not found or 4xx response
      }
    });

    if (ban) {
      this._logger.silly('Proxy was banned, swapping proxies...');
      this.shouldBanProxy = 0;
      this._emitMonitorEvent({ message: 'Proxy banned!' });
      return States.SWAP;
    }

    let message = 'No product found.';

    switch (delayStatus) {
      case ErrorCodes.ProductNotLive:
        message = 'Placeholder found!';
        break;
      case ErrorCodes.PasswordPage:
      case 601:
        message = 'Password page.';
        break;
      default:
        break;
    }

    this._emitMonitorEvent({ message: `${message} Delaying ${monitorDelay}ms` });
    this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
    await this._delayer;
    return States.PARSE;
  }

  async _handleSwapProxies() {
    const {
      task: { errorDelay },
    } = this._context;
    try {
      this._logger.silly('Waiting for new proxy...');
      const proxy = await this.swapProxies();

      this._logger.debug(
        'PROXY IN _handleSwapProxies: %j Should Ban?: %d',
        proxy,
        this.shouldBanProxy,
      );
      // Proxy is fine, update the references
      if (proxy || proxy === null) {
        if (proxy === null) {
          this.proxy = proxy;
          this._context.proxy = proxy;
          this._context.rawProxy = 'localhost';
          this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
          this._emitMonitorEvent({
            message: `Swapped proxy to: localhost`,
            proxy,
          });
        } else {
          this.proxy = proxy;
          this._context.proxy = proxy.proxy;
          this._context.rawProxy = proxy.raw;
          this.shouldBanProxy = 0; // reset ban flag
          this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
          this._emitMonitorEvent({
            message: `Swapped proxy to: ${proxy.raw}`,
            proxy: proxy.raw,
          });
        }
        this._logger.debug('Rewinding to state: %s', this._prevState);
        return this._prevState;
      }

      this._emitMonitorEvent({
        message: `No open proxy! Delaying ${errorDelay}ms`,
      });
      // If we get a null proxy back, there aren't any available. We should wait the error delay, then try again
      this._delayer = waitForDelay(errorDelay, this._aborter.signal);
      await this._delayer;
      this._emitMonitorEvent({ message: 'Proxy banned!' });
    } catch (err) {
      this._logger.verbose('Swap Proxies Handler completed with errors: %s', err, err);
      this._emitMonitorEvent({
        message: 'Error swapping proxies! Retrying...',
      });
    }
    // Go back to previous state
    return this._prevState;
  }

  async _parseAll() {
    // Create the parsers and start the async run methods

    const Parsers = getParsers(this._context.task.site.url);

    const parsers = Parsers(
      this._request,
      this._parseType,
      this._context.task,
      this._context.proxy,
      new AbortController(),
      this._context.logger,
    );

    // Return the winner of the race
    return rfrl(parsers.map(p => p.run()), 'parseAll');
  }

  async _monitorKeywords() {
    if (this._context.aborted || this._context.productFound) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { site } = this._context.task;
    let parsed;
    try {
      // Try parsing all files and wait for the first response
      parsed = await this._parseAll();
    } catch (errors) {
      this._logger.debug('MONITOR: All request errored out! %j', errors);
      // handle parsing errors
      return this._handleParsingErrors(errors);
    }
    this._logger.debug('MONITOR: %s retrieved as a matched product', parsed.title);
    this._logger.debug('MONITOR: Mapping variant lists now...');
    this._context.task.product.restockUrl = parsed.url; // Store restock url in case all variants are out of stock
    this._context.task.product.url = `${site.url}/products/${parsed.handle}`;
    this._context.task.product.name = capitalizeFirstLetter(parsed.title);
    this._context.task.product.variants = parsed.variants.map(v =>
      pick(
        v,
        'id',
        'product_id',
        'title',
        'available',
        'price',
        'option1',
        'option2',
        'option3',
        'option4',
      ),
    );
    this._logger.debug('MONITOR: Status is OK, emitting event');

    this._events.emit(
      TaskManagerEvents.ProductFound,
      this.id,
      this._context.task.product,
      this._parseType,
    );

    const { name } = this._context.task.product;
    this._emitMonitorEvent({
      message: `Product found: ${name}`,
      found: name || undefined,
    });
    return States.DONE;
  }

  async _monitorUrl() {
    if (this._context.aborted || this._context.productFound) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const [url] = this._context.task.product.url.split('?');

    try {
      // Try getting full product info
      const fullProductInfo = await Parser.getFullProductInfo(
        url,
        this._context.proxy,
        this._request,
        this._logger,
      );

      // Generate Variants
      this._logger.silly(
        'MONITOR: Retrieve Full Product %s, Mapping Variants List...',
        fullProductInfo.title,
      );
      this._context.task.product.variants = fullProductInfo.variants.map(v =>
        pick(
          v,
          'id',
          'product_id',
          'title',
          'available',
          'price',
          'option1',
          'option2',
          'option3',
          'option4',
        ),
      );
      this._context.task.product.restockUrl = url; // Store restock url in case all variants are out of stock
      this._logger.silly('MONITOR: Variants mapped! Updating context...');

      // Everything is setup -- kick it off to checkout
      this._logger.silly('MONITOR: Status is OK, proceeding checkout');
      this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);
      this._events.emit(
        TaskManagerEvents.ProductFound,
        this.id,
        this._context.task.product,
        this._parseType,
      );

      const { name } = this._context.task.product;
      this._emitMonitorEvent({
        message: `Product found: ${name}`,
        found: name || undefined,
      });
      return States.DONE;
    } catch (errors) {
      // handle parsing errors
      this._logger.error('MONITOR: All request errored out! %j', errors);
      return this._handleParsingErrors(errors);
    }
  }

  async _monitorSpecial() {
    if (this._context.aborted || this._context.productFound) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { task, proxy, logger } = this._context;
    const { site, product } = task;
    // Get the correct special parser
    const ParserCreator = getSpecialParser(site);
    const parseType = getParseType(product, null, Platforms.Shopify);
    const parser = ParserCreator(this._request, parseType, task, proxy, this._aborter, logger);

    let parsed;
    try {
      parsed = await parser.run();
    } catch (error) {
      this._logger.error('MONITOR: %s Error with special parsing!', error.status);
      return this._handleParsingErrors([error]);
    }
    this._logger.silly('MONITOR: %s retrieved as a matched product', parsed.title);
    this._logger.silly('MONITOR: Mapping variant lists now...');
    this._context.task.product.restockUrl = parsed.url; // Store restock url in case all variants are out of stock
    this._context.task.product.variants = parsed.variants.map(v =>
      pick(
        v,
        'id',
        'product_id',
        'title',
        'available',
        'price',
        'option1',
        'option2',
        'option3',
        'option4',
      ),
    );
    this._logger.silly('MONITOR: Variants mapped! Updating context...');
    this._context.task.product.name = capitalizeFirstLetter(parsed.title);
    this._logger.silly('MONITOR: Status is OK, proceeding to checkout');
    this._events.emit(
      TaskManagerEvents.ProductFound,
      this.id,
      this._context.task.product,
      this._parseType,
    );

    const { name } = this._context.task.product;
    this._emitMonitorEvent({
      message: `Product found: ${name}`,
      found: name || undefined,
    });
    return States.DONE;
  }

  async _handleParse() {
    if (this._context.aborted || this._context.productFound) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    this._emitMonitorEvent({ message: 'Parsing products' });

    switch (this._parseType) {
      case ParseType.Variant: {
        this._logger.silly('MONITOR: Variant Parsing Detected');
        this._logger.silly('MONITOR: Variants mapped! Updating context...');
        this._context.task.product.variants = [{ id: this._context.task.product.variant }];

        this._logger.silly('MONITOR: Status is OK, proceeding to checkout');
        this._events.emit(
          TaskManagerEvents.ProductFound,
          this.id,
          this._context.task.product,
          this._parseType,
        );
        return States.DONE;
      }
      case ParseType.Url: {
        this._logger.silly('MONITOR: Url Parsing Detected');
        return this._monitorUrl();
      }
      case ParseType.Keywords: {
        this._logger.silly('MONITOR: Keyword Parsing Detected');
        return this._monitorKeywords();
      }
      case ParseType.Special: {
        this._logger.silly('MONITOR: Special Parsing Detected');
        return this._monitorSpecial();
      }
      default: {
        this._logger.error(
          'MONITOR: Unable to Monitor Type: %s -- Delaying and Retrying...',
          this._parseType,
        );
        return States.ERROR;
      }
    }
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    this._logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.PARSE]: this._handleParse,
      [States.MATCH]: this._handleMatch,
      [States.RESTOCK]: this._handleRestock,
      [States.SWAP]: this._handleSwapProxies,
      [States.ERROR]: () => States.STOP,
      [States.DONE]: () => States.STOP,
      [States.ABORT]: () => States.STOP,
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
        return true;
      }
    }
    this._logger.debug('Monitor Loop finished, state transitioned to: %s', nextState);

    if (this._state !== nextState) {
      this._history.push(this._state);
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

    if (this._context.productFound) {
      this._state = States.STOP;
      shouldStop = true;
    }

    while (this._state !== States.STOP && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.run();
    }

    this._cleanup();
  }
}

module.exports = Monitor;
