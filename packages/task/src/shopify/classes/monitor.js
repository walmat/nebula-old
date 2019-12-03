import AbortController from 'abort-controller';
import { pick } from 'lodash';

import { Constants, Utils, Bases } from '../../common';
import { Parser, getParsers } from '../parsers';
import { Monitor as MonitorConstants } from '../constants';

const { BaseMonitor } = Bases;
const { rfrl, capitalizeFirstLetter, waitForDelay, emitEvent } = Utils;
const { Platforms, Monitor, Task, ErrorCodes } = Constants;
const { ParseType } = Monitor;
const { Events } = Task;
const { States } = MonitorConstants;

// SHOPIFY
export default class MonitorPrimitive extends BaseMonitor {
  constructor(context, type = ParseType.Unknown, platform = Platforms.Supreme) {
    super(context, platform);

    this._type = type;
    this._state = States.PARSE;
    this._prevState = States.PARSE;
  }

  async _handleParsingErrors(errors) {
    const { logger, aborted } = this._context;
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { monitor } = this._context.task;
    let delayStatus;
    let ban = false; // assume we don't have a softban
    errors.forEach(({ status }) => {
      if (!status) {
        return;
      }

      if (/429|430|ECONNRESET|ENOTFOUND/.test(status)) {
        // status is 429, 430, or a connection error so set ban to true
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

    if (ban) {
      logger.silly('Proxy was banned, swapping proxies...');
      emitEvent(
        this._context,
        this._context.ids,
        {
          message: 'Proxy banned!',
        },
        Events.MonitorStatus,
      );
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

    emitEvent(
      this._context,
      this._context.ids,
      {
        message: `${message} Delaying ${monitor}ms`,
      },
      Events.MonitorStatus,
    );

    this._delayer = waitForDelay(monitor, this._aborter.signal);
    await this._delayer;
    return States.PARSE;
  }

  async _parseAll() {
    // Create the parsers and start the async run methods
    const Parsers = getParsers(this._context.task.store.url);

    const parsers = Parsers(
      this._fetch,
      this._parseType,
      this._context.task,
      this._context.proxy,
      new AbortController(),
      this._context.logger,
      this._matchRandom,
    );

    // Return the winner of the race
    return rfrl(parsers.map(p => p.run()), 'parseAll');
  }

  async _monitorKeywords() {
    const { aborted, logger } = this._context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { store } = this._context.task;
    let parsed;
    try {
      // Try parsing all files and wait for the first response
      parsed = await this._parseAll();
    } catch (errors) {
      logger.debug('MONITOR: All request errored out! %j', errors);
      // handle parsing errors
      return this._handleParsingErrors(errors);
    }

    logger.debug('MONITOR: %s retrieved as a matched product', parsed.title);
    logger.debug('MONITOR: Mapping variant lists now...');
    this._context.task.product.restockUrl = parsed.url; // Store restock url in case all variants are out of stock
    this._context.task.product.image = parsed.featured_image;
    this._context.task.product.hash = parsed.hash || '';
    this._context.task.product.url = `${store.url}/products/${parsed.handle}`;
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
    logger.debug('MONITOR: Status is OK, emitting event');

    const { name } = this._context.task.product;
    emitEvent(
      this._context,
      this._context.ids,
      {
        message: `Product found: ${name}`,
      },
      Events.MonitorStatus,
    );
    return States.DONE;
  }

  async _monitorUrl() {
    const { aborted, logger } = this._context;
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const [url] = this._context.task.product.url.split('?');

    try {
      // Try getting full product info
      const fullProductInfo = await Parser.getFullProductInfo(
        url,
        this._context.proxy,
        this._fetch,
        logger,
      );

      // Generate Variants
      logger.silly(
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
      logger.silly('MONITOR: Variants mapped! Updating context...');

      // Everything is setup -- kick it off to checkout
      logger.silly('MONITOR: Status is OK, proceeding checkout');
      this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);

      const { name } = this._context.task.product;

      emitEvent(
        this._context,
        this._context.ids,
        {
          message: `Product found: ${name}`,
        },
        Events.MonitorStatus,
      );

      return States.DONE;
    } catch (errors) {
      // handle parsing errors
      logger.error('MONITOR: All request errored out! %j', errors);
      return this._handleParsingErrors(errors);
    }
  }

  async _handleParse() {
    const { aborted, logger, parseType } = this._context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    emitEvent(
      this._context,
      this._context.ids,
      {
        message: `Parsing products`,
      },
      Events.MonitorStatus,
    );

    switch (parseType) {
      case ParseType.Variant: {
        logger.silly('MONITOR: Variant Parsing Detected');
        logger.silly('MONITOR: Variants mapped! Updating context...');
        this._context.task.product.variants = [{ id: this._context.task.product.variant }];

        logger.silly('MONITOR: Status is OK, proceeding to checkout');
        return States.DONE;
      }
      case ParseType.Url: {
        logger.silly('MONITOR: Url Parsing Detected');
        return this._monitorUrl();
      }
      case ParseType.Keywords: {
        logger.silly('MONITOR: Keyword Parsing Detected');
        return this._monitorKeywords();
      }
      default: {
        logger.error('MONITOR: Unable to Monitor Type: %s', parseType);
        return States.ERROR;
      }
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
      [States.MATCH]: this._handleMatch,
      [States.SWAP]: this._handleSwapProxies,
      [States.ERROR]: () => States.ABORT,
      [States.DONE]: () => States.ABORT,
      [States.ABORT]: () => States.ABORT,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }
}
