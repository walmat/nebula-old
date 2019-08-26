import EventEmitter from 'eventemitter3';
import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';
import { CookieJar } from 'tough-cookie';
import { createLogger } from '../../common/logger';

const TaskManagerEvents = require('./utils/constants').TaskManager.Events;
const { Parser, AtomParser, JsonParser, XmlParser, getSpecialParser } = require('./parsers');
const { rfrl, capitalizeFirstLetter, waitForDelay } = require('./utils');
const {
  Monitor: { States, Events, DelayTypes, ParseType },
  TaskRunner: { Types },
} = require('./utils/constants');
const { ErrorCodes } = require('./utils/constants');
const generateVariants = require('./utils/generateVariants');

class Monitor {
  constructor(id, task, proxy, loggerPath, type = ParseType.Unknown) {
    this._id = id;
    this._task = task;
    this._parseType = type;
    this._proxy = proxy;
    this._jar = new CookieJar();
    this._aborter = new AbortController();
    this._signal = this._aborter.signal;
    // eslint-disable-next-line global-require
    const request = require('fetch-cookie')(fetch, this._jar);
    this._request = defaults(request, task.site.url, {
      timeout: 60000, // to be overridden as necessary
      signal: this._aborter.signal, // generic abort signal
    });
    this._delayer = null;

    /**
     * Logger Instance
     */
    this._logger = createLogger({
      dir: loggerPath,
      name: `TaskRunner-${id}`,
      prefix: `runner-${id}`,
    });

    this._state = States.PARSE;
    this._prevState = States.PARSE;
    this.shouldBanProxy = 0;
    this._events = new EventEmitter();

    this._context = {
      id,
      type,
      task,
      status: null,
      proxy: proxy ? proxy.proxy : null,
      rawProxy: proxy ? proxy.raw : null,
      aborter: this._aborter,
      delayer: this._delayer,
      events: this._events,
      signal: this._aborter.signal,
      request: this._request,
      jar: this._jar,
      logger: this._logger,
      aborted: false,
    };

    this._handleAbort = this._handleAbort.bind(this);
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

  _handleAbort(id) {
    if (id === this._context.id) {
      this._context.aborted = true;
      this._aborter.abort();
      if (this._delayer) {
        this._delayer.clear();
      }
    }
  }

  async swapProxies() {
    // emit the swap event
    this._events.emit(Events.SwapProxy, this.id, this.proxy, this.shouldBanProxy);
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
      case Events.TaskStatus: {
        this._events.on(Events.TaskStatus, callback);
        break;
      }
      default:
        break;
    }
  }

  deregisterForEvent(event, callback) {
    switch (event) {
      case Events.TaskStatus: {
        this._events.removeListener(Events.TaskStatus, callback);
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
      case Events.TaskStatus: {
        this._events.emit(event, this._context.id, payload, event);
        break;
      }
      default: {
        break;
      }
    }
    this._logger.silly('Event %s emitted: %j', event, payload);
  }

  _emitTaskEvent(payload = {}) {
    if (payload.message && payload.message !== this._context.status) {
      this._status = payload.message;
      this._emitEvent(Events.TaskStatus, { ...payload, type: Types.Normal });
    }
  }

  async wait(delay) {
    this._delayer = waitForDelay(delay, this._aborter.signal);
    await this._delayer;
  }

  async _handleParsingErrors(errors) {
    const { monitorDelay } = this._context.task;
    let delayStatus;
    let ban = true; // assume we have a softban
    let hardBan = false; // assume we don't have a hardban
    errors.forEach(({ status }) => {
      if (!status) {
        return;
      }

      if (status === 403) {
        // ban is a strict hardban, so set the flag
        hardBan = true;
      } else if (status !== 429 && status !== 430) {
        // status is neither 403, 429, 430, so set ban to false
        ban = false;
      }
      if (
        !delayStatus &&
        (status === ErrorCodes.ProductNotFound ||
          status === ErrorCodes.ProductNotLive ||
          status >= 400)
      ) {
        delayStatus = status; // find the first error that is either a product not found or 4xx response
      }
    });

    if (ban || hardBan) {
      this._logger.silly('Proxy was banned, swapping proxies...');
      // we can assume that it's a soft ban by default since it's either ban || hardBan
      this.shouldBan = hardBan ? 2 : 1;
      this._emitTaskEvent({ message: 'Proxy banned!' });
      return States.SWAP;
    }

    let message = 'No product found';

    switch (delayStatus) {
      case ErrorCodes.ProductNotLive:
        message = 'Product not live';
        break;
      case ErrorCodes.PasswordPage:
      case 601:
        message = 'Password page';
        break;
      default:
        break;
    }

    this._emitTaskEvent({ message: `${message}. Delaying ${this._context.task.monitorDelay}ms` });
    await this.wait(monitorDelay);
    return States.PARSE;
  }

  async _parseAll() {
    // Create the parsers and start the async run methods
    const parsers = [
      new AtomParser(
        this._request,
        this._context.task,
        this._context.proxy,
        this._aborter,
        this._context.logger,
      ),
      new JsonParser(
        this._request,
        this._context.task,
        this._context.proxy,
        this._aborter,
        this._context.logger,
      ),
      new XmlParser(
        this._request,
        this._context.task,
        this._context.proxy,
        this._aborter,
        this._context.logger,
      ),
    ].map(p => p.run());
    // Return the winner of the race
    return rfrl(parsers, 'parseAll');
  }

  async _generateVariants(product) {
    const { sizes, site, monitorDelay } = this._context.task;
    let variants;
    let barcode;
    let chosenSizes;
    try {
      ({ variants, barcode, sizes: chosenSizes } = generateVariants(
        product,
        sizes,
        site,
        this._logger,
      ));
    } catch (err) {
      if (err.code === ErrorCodes.VariantsNotMatched) {
        this._emitTaskEvent({ message: `Zero matched variants! Stopping..` });
        return { nextState: States.STOP };
      }
      if (err.code === ErrorCodes.VariantsNotAvailable) {
        this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms` });
        await this.wait(monitorDelay);
        return { nextState: States.RESTOCK, delay: true };
      }
      this._logger.error('MONITOR: Unknown error generating variants: %j', err);
      this._emitTaskEvent({ message: `Monitor has errored out!` });
      return { nextState: States.ERROR };
    }
    return { variants, barcode, sizes: chosenSizes };
  }

  async _monitorKeywords() {
    const { monitorDelay, site } = this._context.task;
    let parsed;
    try {
      // Try parsing all files and wait for the first response
      parsed = await this._parseAll();
    } catch (errors) {
      this._logger.silly('MONITOR: All request errored out! %j', errors);
      // handle parsing errors
      return this._handleParsingErrors(errors);
    }
    this._logger.silly('MONITOR: %s retrieved as a matched product', parsed.title);
    this._logger.silly('MONITOR: Generating variant lists now...');
    this._context.task.product.restockUrl = parsed.url; // Store restock url in case all variants are out of stock
    this._context.task.product.name = capitalizeFirstLetter(parsed.title);
    const { variants, barcode, sizes, nextState, delay, message } = this._generateVariants(parsed);
    // check for next state (means we hit an error when generating variants)
    if (nextState) {
      this._emitTaskEvent({ message });
      if (delay) {
        await this.wait(monitorDelay);
      }
      return nextState;
    }

    this._logger.silly('MONITOR: Variants Generated, updating context...');
    this._context.task.product.barcode = barcode;
    this._context.task.product.variants = variants;
    this._context.task.product.chosenSizes = sizes;
    this._context.task.product.url = `${site.url}/products/${parsed.handle}`;
    this._logger.debug('MONITOR: Status is OK, emitting event');
    this._events.emit(
      TaskManagerEvents.ProductFound,
      this._id,
      this._context.task.product,
      this._parseType,
    );

    const { chosenSizes, name } = this._context.task.product;
    this._emitTaskEvent({
      message: `Product found: ${this._context.task.product.name}`,
      size: chosenSizes ? chosenSizes[0] : undefined,
      found: name || undefined,
    });
    return States.DONE;
  }

  async _monitorUrl() {
    const { monitorDelay } = this._context.task;
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
        'MONITOR: Retrieve Full Product %s, Generating Variants List...',
        fullProductInfo.title,
      );
      this._context.task.product.restockUrl = url; // Store restock url in case all variants are out of stock
      const { variants, barcode, sizes, nextState, delay, message } = this._generateVariants(
        fullProductInfo,
      );
      // check for next state (means we hit an error when generating variants)
      if (nextState) {
        this._emitTaskEvent({ message });
        if (delay) {
          await this.wait(monitorDelay);
        }
        return nextState;
      }
      this._logger.silly('MONITOR: Variants Generated, updating context...');
      this._context.task.product.barcode = barcode;
      this._context.task.product.variants = variants;
      this._context.task.product.chosenSizes = sizes;

      // Everything is setup -- kick it off to checkout
      this._logger.silly('MONITOR: Status is OK, proceeding checkout');
      this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);
      this._events.emit(
        TaskManagerEvents.ProductFound,
        this._id,
        this._context.task.product,
        this._parseType,
      );

      const { chosenSizes, name } = this._context.task.product;
      this._emitTaskEvent({
        message: `Product found: ${this._context.task.product.name}`,
        size: chosenSizes ? chosenSizes[0] : undefined,
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
    const { task, proxy, logger } = this._context;
    const { product, site, monitorDelay } = task;
    // Get the correct special parser
    const ParserCreator = getSpecialParser(site);
    const parser = ParserCreator(this._request, task, proxy, this._aborter, logger);

    let parsed;
    try {
      parsed = await parser.run();
    } catch (error) {
      this._logger.error('MONITOR: %s Error with special parsing! %j', error);
      return this._handleParsingErrors([error]);
    }
    this._logger.silly('MONITOR: %s retrieved as a matched product', parsed.title);
    this._logger.silly('MONITOR: Generating variant lists now...');
    this._context.task.product.restockUrl = parsed.url; // Store restock url in case all variants are out of stock
    let variants;
    let barcode;
    let sizes;
    let nextState;
    let delay;
    let message;
    if (product.variant) {
      variants = [product.variant];
    } else {
      ({ variants, barcode, sizes, nextState, delay, message } = this._generateVariants(parsed));
      // check for next state (means we hit an error when generating variants)
      if (nextState) {
        this._emitTaskEvent({ message });
        if (delay) {
          await this.wait(monitorDelay);
        }
        return nextState;
      }
    }
    this._logger.silly('MONITOR: Variants Generated, updating context...');
    this._context.task.product.barcode = barcode;
    this._context.task.product.variants = variants;
    this._context.task.product.chosenSizes = sizes;
    this._context.task.product.name = capitalizeFirstLetter(parsed.title);
    this._logger.silly('MONITOR: Status is OK, proceeding to checkout');
    this._events.emit(
      TaskManagerEvents.ProductFound,
      this._id,
      this._context.task.product,
      this._parseType,
    );

    const { chosenSizes, name } = this._context.task.product;
    this._emitTaskEvent({
      message: `Product found: ${this._context.task.product.name}`,
      size: chosenSizes ? chosenSizes[0] : undefined,
      found: name || undefined,
    });
    return States.DONE;
  }

  async _handleParse() {
    if (this._context.aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let nextState;
    switch (this._parseType) {
      case ParseType.Variant: {
        this._logger.silly('MONITOR: Variant Parsing Detected');
        this._context.task.product.variants = [this._context.task.product.variant];
        this._events.emit(
          Events.ProductFound,
          this._id,
          this._context.task.product,
          this._parseType,
        );
        nextState = States.DONE;
        break;
      }
      case ParseType.Url: {
        this._logger.silly('MONITOR: Url Parsing Detected');
        nextState = await this._monitorUrl();
        break;
      }
      case ParseType.Keywords: {
        this._logger.silly('MONITOR: Keyword Parsing Detected');
        nextState = await this._monitorKeywords();
        break;
      }
      case ParseType.Special: {
        this._logger.silly('MONITOR: Special Parsing Detected');
        nextState = await this._monitorSpecial();
        break;
      }
      default: {
        this._logger.error(
          'MONITOR: Unable to Monitor Type: %s -- Delaying and Retrying...',
          this._parseType,
        );
        return States.ERROR;
      }
    }
    return nextState;
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
      if (proxy) {
        this._proxy = proxy;
        this._context.proxy = proxy.proxy;
        this._context.rawProxy = proxy.raw;
        this.shouldBanProxy = 0; // reset ban flag
        this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
        this._emitTaskEvent({
          message: `Swapped proxy to: ${proxy.raw}`,
          proxy: proxy.raw,
        });
        return this._prevState;
      }

      this._emitTaskEvent({
        message: `No open proxy! Delaying ${errorDelay}ms`,
      });
      // If we get a null proxy back, there aren't any available. We should wait the error delay, then try again
      this._delayer = waitForDelay(errorDelay, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Proxy banned!' });
    } catch (err) {
      this._logger.verbose('Swap Proxies Handler completed with errors: %s', err, err);
      this._emitTaskEvent({
        message: 'Error swapping proxies! Retrying...',
      });
    }
    // Go back to previous state
    return this._prevState;
  }

  _generateEndStateHandler(state) {
    let status = 'stopped';
    switch (state) {
      case States.ABORT: {
        status = 'aborted';
        break;
      }
      case States.ERROR: {
        status = 'errored out';
        break;
      }
      case States.DONE: {
        status = 'finished';
        break;
      }
      default: {
        break;
      }
    }
    return () => {
      this._emitTaskEvent({
        message: `Monitor has ${status}`,
        done: true,
      });
      return States.STOP;
    };
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
      [States.SWAP]: this._handleSwap,
      [States.ERROR]: this._generateEndStateHandler(States.ERROR),
      [States.DONE]: this._generateEndStateHandler(States.DONE),
      [States.ABORT]: this._generateEndStateHandler(States.ABORT),
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }

  // MARK: State Machine Run Loop

  async runSingleLoop() {
    let nextState = this._state;

    if (this._context.aborted) {
      nextState = States.ABORT;
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
    this._logger.silly('Monitor Loop finished, state transitioned to: %s', nextState);

    if (this._state !== nextState) {
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
    while (this._state !== States.STOP && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.runSingleLoop();
    }
  }
}

module.exports = Monitor;
