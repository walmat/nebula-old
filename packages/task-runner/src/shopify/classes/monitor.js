import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';
import { CookieJar } from 'tough-cookie';

const _request = require('fetch-cookie')(fetch, new CookieJar());

const { Parser, AtomParser, JsonParser, XmlParser, getSpecialParser } = require('./parsers');
const { rfrl, capitalizeFirstLetter } = require('./utils');
const { States, Events } = require('./utils/constants').TaskRunner;
const { ErrorCodes } = require('./utils/constants');
const { ParseType, getParseType } = require('./utils/parse');
const generateVariants = require('./utils/generateVariants');

class Monitor {
  get aborter() {
    return this._aborter;
  }

  get delayer() {
    return this._delayer;
  }

  constructor(context) {
    /**
     * All data needed for monitor to run
     * This includes:
     * - runner_id: current runner id
     * - task: current task
     * - proxy: current proxy
     * - aborted: whether or not we should abort
     * @type {TaskRunnerContext}
     */
    this._context = context;
    this._type = this._context.type;
    this._events = this._context.events;
    this._logger = this._context.logger;
    this._aborter = new AbortController();
    this._request = defaults(_request, context.task.site.url, {
      timeout: 10000, // to be overridden as necessary
      signal: this._aborter.signal, // generic abort signal
    });
    this._delayer = this._context.delayer;
    this._signal = this._context.signal;
    this._parseType = null;
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
      this._context.status = payload.message;
      this._emitEvent(Events.TaskStatus, { ...payload, type: this._type });
    }
  }

  async _handleParsingErrors(errors) {
    let delayStatus;
    let ban = true; // assume we have a softban
    let hardBan = false; // assume we don't have a hardban

    errors.forEach(({ status }) => {
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
      const shouldBan = hardBan ? 2 : 1;
      return {
        message: 'Swapping proxy',
        shouldBan,
        nextState: States.SwapProxies,
      };
    }

    let message = 'Monitoring for product';

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

    return { message, nextState: States.Monitor };
  }

  _parseAll() {
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

  _generateVariants(product) {
    const { sizes, site, monitorDelay } = this._context.task;
    let variants;
    let chosenSizes;
    try {
      ({ variants, sizes: chosenSizes } = generateVariants(product, sizes, site, this._logger));
    } catch (err) {
      this._logger.debug('ERROR:::: %j', err);
      if (err.code === ErrorCodes.VariantsNotMatched) {
        return {
          message: 'Unable to match variants',
          nextState: States.Stopped,
        };
      }
      if (err.code === ErrorCodes.VariantsNotAvailable) {
        const nextState = this._parseType === ParseType.Special ? States.Monitor : States.Restocking;
        this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms` });
        return { message: `Out of stock! Delaying ${monitorDelay}ms`, nextState };
      }
      this._logger.error('MONITOR: Unknown error generating variants: %s', err.message, err.stack);
      return {
        message: 'Task has errored out!',
        nextState: States.Errored,
      };
    }
    return { variants, sizes: chosenSizes };
  }

  async _monitorKeywords() {
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
    const { site } = this._context.task;
    const { variants, sizes, nextState, message } = this._generateVariants(parsed);
    // check for next state (means we hit an error when generating variants)
    if (nextState) {
      return { nextState, message };
    }
    this._logger.silly('MONITOR: Variants Generated, updating context...');
    this._context.task.product.variants = variants;
    this._context.task.product.chosenSizes = sizes;
    this._context.task.product.url = `${site.url}/products/${parsed.handle}`;
    this._logger.silly('MONITOR: Status is OK, proceeding to checkout');
    return {
      message: `Found product: ${this._context.task.product.name}`,
      nextState: States.AddToCart,
    };
  }

  async _monitorUrl() {
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
      const { variants, sizes, nextState, message } = this._generateVariants(fullProductInfo);
      // check for next state (means we hit an error when generating variants)
      if (nextState) {
        return { nextState, message };
      }
      this._logger.silly('MONITOR: Variants Generated, updating context...');
      this._context.task.product.variants = variants;
      this._context.task.product.chosenSizes = sizes;

      // Everything is setup -- kick it to checkout
      this._logger.silly('MONITOR: Status is OK, proceeding to checkout');
      this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);
      return {
        message: `Found product: ${this._context.task.product.name}`,
        nextState: States.AddToCart,
      };
    } catch (errors) {
      // handle parsing errors
      this._logger.error('MONITOR: All request errored out! %j', errors);
      return this._handleParsingErrors(errors);
    }
  }

  async _monitorSpecial() {
    const { task, proxy, logger } = this._context;
    const { product, site } = task;
    // Get the correct special parser
    const ParserCreator = getSpecialParser(site);
    const parser = ParserCreator(this._request, task, proxy, this._aborter, logger);

    let parsed;
    try {
      parsed = await parser.run();
    } catch (error) {
      this._logger.error(
        'MONITOR: %s Error with special parsing! %j %j',
        error.status,
        error.message,
        error.stack,
      );

      return this._handleParsingErrors([error]);
    }
    this._logger.silly('MONITOR: %s retrieved as a matched product', parsed.title);
    this._logger.silly('MONITOR: Generating variant lists now...');
    this._context.task.product.restockUrl = parsed.url; // Store restock url in case all variants are out of stock
    let variants;
    let sizes;
    let nextState;
    let message;
    if (product.variant) {
      variants = [product.variant];
    } else {
      ({ variants, sizes, nextState, message } = this._generateVariants(parsed));
      // check for next state (means we hit an error when generating variants)
      if (nextState) {
        return { nextState, message };
      }
    }
    this._logger.silly('MONITOR: Variants Generated, updating context...');
    this._context.task.product.variants = variants;
    this._context.task.product.chosenSizes = sizes;
    this._context.task.product.name = capitalizeFirstLetter(parsed.title);
    this._logger.silly('MONITOR: Status is OK, proceeding to checkout');
    return {
      message: `Found product: ${this._context.task.product.name}`,
      nextState: States.AddToCart,
    };
  }

  async run() {
    if (this._context.aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return { nextState: States.Aborted };
    }

    this._parseType = getParseType(
      this._context.task.product,
      this._logger,
      this._context.task.site,
    );

    let result;
    switch (this._parseType) {
      case ParseType.Variant: {
        // TODO: Add a way to determine if variant is correct
        this._logger.silly('MONITOR: Variant Parsing Detected');
        this._context.task.product.variants = [this._context.task.product.variant];
        result = { message: 'Adding to cart', nextState: States.AddToCart };
        break;
      }
      case ParseType.Url: {
        this._logger.silly('MONITOR: Url Parsing Detected');
        result = await this._monitorUrl();
        break;
      }
      case ParseType.Keywords: {
        this._logger.silly('MONITOR: Keyword Parsing Detected');
        result = await this._monitorKeywords();
        break;
      }
      case ParseType.Special: {
        this._logger.silly('MONITOR: Special Parsing Detected');
        result = await this._monitorSpecial();
        break;
      }
      default: {
        this._logger.error(
          'MONITOR: Unable to Monitor Type: %s -- Delaying and Retrying...',
          this._parseType,
        );
        return { message: 'Invalid Product Input given!', nextState: States.Errored };
      }
    }
    // If the next state is an error, use the message as the ending status
    if (result.nextState === States.Errored) {
      this._context.status = result.message;
    }
    return result;
  }
}

module.exports = Monitor;
