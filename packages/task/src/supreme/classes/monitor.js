import { Bases, Constants, Utils } from '../../common';
import getHeaders, { matchKeywords, matchVariation } from '../utils';
import { Monitor } from '../constants';

const { BaseMonitor } = Bases;
const { Task: TaskContants, Platforms, ErrorCodes } = Constants;
const { emitEvent, waitForDelay, capitalizeFirstLetter } = Utils;

const { States } = Monitor;
const { Events } = TaskContants;

// SUPREME
export default class MonitorPrimitive extends BaseMonitor {
  constructor(context, platform = Platforms.Supreme) {
    super(context, platform);

    this._state = States.PARSE;
    this._prevState = this._state;
  }

  async _handleError(error = {}, state) {
    const { aborted, logger } = this.context;
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
      emitEvent(
        this.context,
        this.context.ids,
        {
          message: `${status}! Delaying ${this.context.task.errorDelay}ms (${status})`,
        },
        Events.MonitorStatus,
      );
      this._delayer = waitForDelay(this.context.task.errorDelay, this._aborter.signal);
      await this._delayer;
    } else if (
      status === ErrorCodes.ProductNotFound ||
      status === ErrorCodes.NoStylesFound ||
      status === ErrorCodes.VariantNotFound
    ) {
      emitEvent(
        this.context,
        this.context.ids,
        {
          message: `${status}! Delaying ${this.context.task.monitor}ms`,
        },
        Events.MonitorStatus,
      );
      this._delayer = waitForDelay(this.context.task.monitor, this._aborter.signal);
      await this._delayer;
    }
    return state;
  }

  async _handleParse() {
    const { aborted, task, proxy, logger } = this.context;
    const { product, category } = task;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    emitEvent(
      this.context,
      this.context.ids,
      {
        message: 'Parsing products',
      },
      Events.MonitorStatus,
    );

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
        pos: product.pos,
        neg: product.neg,
      };

      const matchedProduct = await matchKeywords(productsInCategory, keywords, null, logger); // no need to use a custom filter...

      if (!matchedProduct) {
        logger.silly('Supreme Monitor: Unable to find matching product!');
        const error = new Error('Product Not Found');
        error.status = ErrorCodes.ProductNotFound;
        throw error;
      }

      this.context.task.product.name = capitalizeFirstLetter(matchedProduct.name);
      this.context.task.product.price = matchedProduct.price;
      this.context.task.product.style = matchedProduct.id;

      logger.silly('Supreme Monitor: Product found: %j', matchedProduct.name);

      return States.STOCK;
    } catch (error) {
      return this._handleError(error, States.PARSE);
    }
  }

  async _handleStock() {
    const { task, aborted, proxy, logger } = this.context;
    const {
      product: { variation, style },
    } = task;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    emitEvent(
      this.context,
      this.context.ids,
      {
        message: 'Fetching stock',
      },
      Events.MonitorStatus,
    );

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
        emitEvent(
          this.context,
          this.context.ids,
          {
            message: 'No variation matched!',
          },
          Events.MonitorStatus,
        );
        return States.ABORT;
      }

      task.product.id = matchedVariation.id;
      task.product.variants = matchedVariation.sizes;
      task.product.currency = matchedVariation.currency;
      task.product.image = matchedVariation.image_url;
      task.product.chosenVariation = matchedVariation.name;

      const { name } = task.product;
      emitEvent(
        this.context,
        this.context.ids,
        {
          message: `Product found: ${name}`,
        },
        Events.MonitorStatus,
      );
      return States.DONE;
    } catch (error) {
      return this._handleError(error, States.STOCK);
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
      [States.STOCK]: this._handleStock,
      [States.SWAP]: this._handleSwapProxies,
      [States.DONE]: () => States.ABORT,
      [States.ERROR]: () => States.ABORT,
      [States.ABORT]: () => States.ABORT,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }
}
