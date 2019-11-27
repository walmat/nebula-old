import AbortController from 'abort-controller';
import { pick } from 'lodash';

import { Platforms, ErrorCodes } from '../../common/constants';
import { getParseType } from '../utils/parse';
import { Parser, getSpecialParser, getParsers } from '../parsers';
import { rfrl, capitalizeFirstLetter, waitForDelay, BaseMonitor } from '../../common';
import { Monitor, Task as TaskConstants } from '../utils/constants';

const { States, ParseType } = Monitor;
const { Modes } = TaskConstants;

// SHOPIFY
export default class MonitorPrimitive extends BaseMonitor {
  constructor(context, type = ParseType.Unknown, platform = Platforms.Supreme) {
    super(context, platform);

    this._type = type;

    this._state = States.PARSE;
    this._prevState = States.PARSE;
  }

  async _handleParsingErrors(errors) {
    if (this._context.aborted || this._context.productFound) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { monitorDelay } = this._context.task;
    let delayStatus;
    let setImmediate = false;
    let ban = false; // assume we don't have a softban
    errors.forEach(({ status }) => {
      if (!status) {
        return;
      }

      // fallback to special parser...
      if (/404/.test(status) && this._isSpecial && this._parseType === ParseType.Keywords) {
        this._logger.debug('Changing to backup parser!');
        this._parseType = getParseType(
          this._context.task.product,
          this._context.task.site,
          Platforms.Shopify,
        );
        setImmediate = true;
      }

      if (/403/i.test(status) && this._isSpecial && this._parseType === ParseType.Url) {
        this._logger.debug('Changing to backup parser!');
        this._parseType = getParseType(
          this._context.task.product,
          this._context.task.site,
          Platforms.Shopify,
        );
        setImmediate = true;
      }

      if (/429|430|ECONNRESET|ENOTFOUND/.test(status)) {
        // status is neither 429, 430, or a connection error so set ban to false
        ban = true;
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

    if (setImmediate) {
      return States.PARSE;
    }

    if (ban) {
      this._logger.silly('Proxy was banned, swapping proxies...');
      this._emitMonitorEvent({ message: 'Proxy banned!', rawProxy: this._context.rawProxy });
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

    if (this._taskType === Modes.CART) {
      this._emitMonitorEvent({ message: `Starting precart`, rawProxy: this._context.rawProxy });
      this._parseType = ParseType.Keywords; // temporarily set the parseType to keywords..
      this._matchRandom = true;
      return States.PARSE;
    }

    this._emitMonitorEvent({
      message: `${message} Delaying ${monitorDelay}ms`,
      rawProxy: this._context.rawProxy,
    });
    this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
    await this._delayer;
    return States.PARSE;
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
      this._matchRandom,
    );

    // set a flag to let us know later if we hit a 404 to use a backup parser
    if (parsers.length === 1) {
      this._logger.debug('Setting special flag!');
      this._isSpecial = true;
    }

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
    this._context.task.product.image = parsed.featured_image;
    this._context.task.product.hash = parsed.hash || '';
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

    const { name } = this._context.task.product;
    this._emitMonitorEvent({
      message: `Product found: ${name}`,
      found: name || undefined,
      rawProxy: this._context.rawProxy,
    });
    return States.DONE;
  }

  async _monitorUrl() {
    if (this._context.aborted || this._context.productFound) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const [url] = this._context.task.product.url.split('?');

    if (/yeezysupply|eflash|traviss/i.test(url)) {
      this._logger.debug('Setting special flag!');
      this._isSpecial = true;
    }

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
      this._context.task.product.image = fullProductInfo.featured_image;
      this._context.task.product.restockUrl = url; // Store restock url in case all variants are out of stock
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
      this._logger.silly('MONITOR: Variants mapped! Updating context...');

      // Everything is setup -- kick it off to checkout
      this._logger.silly('MONITOR: Status is OK, proceeding checkout');
      this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);

      const { name } = this._context.task.product;
      this._emitMonitorEvent({
        message: `Product found: ${name}`,
        found: name || undefined,
        rawProxy: this._context.rawProxy,
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
    this._context.task.product.image = parsed.featured_image;
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

    const { name } = this._context.task.product;
    this._emitMonitorEvent({
      message: `Product found: ${name}`,
      found: name || undefined,
      rawProxy: this._context.rawProxy,
    });

    return States.DONE;
  }

  async _handleParse() {
    if (this._context.aborted || this._context.productFound) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    this._emitMonitorEvent({ message: 'Parsing products', rawProxy: this._context.rawProxy });

    switch (this._parseType) {
      case ParseType.Variant: {
        this._logger.silly('MONITOR: Variant Parsing Detected');
        this._logger.silly('MONITOR: Variants mapped! Updating context...');
        this._context.task.product.variants = [{ id: this._context.task.product.variant }];

        this._logger.silly('MONITOR: Status is OK, proceeding to checkout');
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
      [States.ERROR]: this._handleError,
      [States.DONE]: this._handleDone,
      [States.ABORT]: () => States.ABORT,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }
}
