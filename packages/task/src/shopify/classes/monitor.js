import AbortController from 'abort-controller';
import { pick } from 'lodash';

import { Constants, Utils, Bases } from '../../common';
import { getParsers } from '../parsers';
import { Parse } from '../utils';
import { Monitor as MonitorConstants } from '../constants';

const { getFullProductInfo } = Parse;
const { BaseMonitor } = Bases;
const { rfrl, capitalizeFirstLetter, waitForDelay, emitEvent } = Utils;
const { Platforms, Monitor, Task, ErrorCodes } = Constants;
const { ParseType } = Monitor;
const { Events } = Task;
const { States } = MonitorConstants;

// SHOPIFY
export default class MonitorPrimitive extends BaseMonitor {
  constructor(context, platform = Platforms.Shopify) {
    super(context, platform);

    this._state = States.PARSE;
    this._prevState = States.PARSE;
  }

  async _handleErrors(errors = []) {
    const { logger, aborted } = this.context;
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { monitor } = this.context.task;
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
        this.context,
        this.context.ids,
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
      this.context,
      this.context.ids,
      {
        message: `${message} Delaying ${monitor}ms`,
      },
      Events.MonitorStatus,
    );

    this._delayer = waitForDelay(monitor, this._aborter.signal);
    await this._delayer;
    return States.PARSE;
  }

  async _parse() {
    // Create the parsers and start the async run methods
    const Parsers = getParsers(this.context.task.store.url);
    const parsers = Parsers(this.context, new AbortController(), this._fetch);

    // Return the winner of the race
    return rfrl(parsers.map(p => p.run()), 'parseAll');
  }

  async _keywords() {
    const { aborted, logger, task } = this.context;

    if (aborted) {
      logger.silly('Abort Detected');
      return States.ABORT;
    }

    const { store } = task;
    let parsed;
    try {
      // Try parsing all files and wait for the first response
      parsed = await this._parse();
    } catch (errors) {
      console.log(errors);
      logger.debug('All request errored out! %j', errors);
      // handle parsing errors
      return this._handleErrors(errors);
    }

    logger.debug('Matched product: %s', parsed.title);
    this.context.task.product.restockUrl = parsed.url; // Store restock url in case all variants are out of stock
    this.context.task.product.image = parsed.featured_image;
    this.context.task.product.hash = parsed.hash || '';
    this.context.task.product.url = `${store.url}/products/${parsed.handle}`;
    this.context.task.product.name = capitalizeFirstLetter(parsed.title);
    this.context.task.product.variants = parsed.variants.map(v =>
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

    const { name } = this.context.task.product;
    emitEvent(
      this.context,
      this.context.ids,
      {
        message: `Product found: ${name}`,
      },
      Events.MonitorStatus,
    );
    return States.DONE;
  }

  async _url() {
    const { aborted, logger, proxy, task } = this.context;
    if (aborted) {
      logger.silly('Abort Detected');
      return States.ABORT;
    }

    const [url] = task.product.url.split('?');

    try {
      // Try getting full product info
      const fullProductInfo = await getFullProductInfo(this._fetch, url, proxy, logger);

      // Generate Variants
      logger.silly('Retrieved product %s', fullProductInfo.title);
      this.context.task.product.image = fullProductInfo.featured_image;
      this.context.task.product.restockUrl = url; // Store restock url in case all variants are out of stock
      this.context.task.product.variants = fullProductInfo.variants.map(v =>
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
      logger.silly('Variants mapped! Updating context...');

      // Everything is setup -- kick it off to checkout
      this.context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);

      const { name } = this.context.task.product;

      emitEvent(
        this.context,
        this.context.ids,
        {
          message: `Product found: ${name}`,
        },
        Events.MonitorStatus,
      );

      return States.DONE;
    } catch (errors) {
      // handle parsing errors
      logger.error('MONITOR: All request errored out! %j', errors);
      return this._handleErrors(errors);
    }
  }

  async _handleParse() {
    const { aborted, logger, parseType } = this.context;

    if (aborted) {
      logger.silly('Abort Detected');
      return States.ABORT;
    }

    emitEvent(
      this.context,
      this.context.ids,
      {
        message: `Parsing products`,
      },
      Events.MonitorStatus,
    );

    switch (parseType) {
      case ParseType.Variant: {
        logger.silly('Variant Parsing Detected');
        this.context.task.product.variants = [{ id: this.context.task.product.variant }];

        return States.DONE;
      }
      case ParseType.Url: {
        logger.silly('Url Parsing Detected');
        return this._url();
      }
      case ParseType.Keywords: {
        logger.silly('Keyword Parsing Detected');
        return this._keywords();
      }
      default: {
        logger.error('Unable to Monitor Type: %s', parseType);
        return States.ERROR;
      }
    }
  }

  async _handleStepLogic(currentState) {
    const { logger } = this.context;

    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.PARSE]: this._handleParse,
      [States.MATCH]: this._handleMatch,
      [States.SWAP]: this._handleSwap,
      [States.ERROR]: () => States.ABORT,
      [States.DONE]: () => States.ABORT,
      [States.ABORT]: () => States.ABORT,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }
}
