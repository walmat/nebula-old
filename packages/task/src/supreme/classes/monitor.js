import { isEmpty } from 'lodash';

import { Bases, Constants, Utils } from '../../common';
import getHeaders, { getRegion, matchKeywords } from '../utils';
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

    this._region = getRegion(context.task.store.name);

    this.detectPooky();
    this._pookyInterval = setInterval(() => this.detectPooky(), 1000);
  }

  async _handleError(error = {}, state) {
    const { aborted, logger } = this.context;
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { status } = error;

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
          message: `Delaying ${this.context.task.monitor}ms (${status})`,
        },
        Events.MonitorStatus,
      );
      this._delayer = waitForDelay(this.context.task.monitor, this._aborter.signal);
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

  async detectPooky() {
    const { logger } = this.context;

    logger.info('--------------------------DETECTING POOKY--------------------------');
    const { NEBULA_POOKY_ON } = process.env;

    try {
      const res = await this._fetch(NEBULA_POOKY_ON);

      if (!res.ok) {
        const error = new Error('Unable to fetch pooky status');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();

      if (!body || isEmpty(body) || (body && !body[this._region.toLowerCase()])) {
        const error = new Error('Invalid response');
        error.status = res.status || res.errno;
        throw error;
      }

      const { state } = body[this._region.toLowerCase()];

      if (this.context.pookyEnabled !== state) {
        // if (!state) {
        //   // clear the cookie jar..
        //   this.context.jar.removeAllCookiesSync();
        // }
        this.context.setPookyEnabled(state);
      }

      return;
    } catch (err) {
      // default back to true just in case...
      if (!this.context.pookyEnabled) {
        this.context.setPookyEnabled(true);
      }
    }
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

    this.context.jar.setCookieSync(
      `lastVisitedFragment=categories/${this.context.task.category};`,
      this.context.task.store.url,
    );

    try {
      const res = await this._fetch('/mobile_stock.json', {
        method: 'GET',
        agent: proxy ? proxy.proxy : null,
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
        '%s category has: %s products',
        category,
        productsInCategory ? productsInCategory.length : 0,
      );

      if (!productsInCategory || (productsInCategory && !productsInCategory.length)) {
        logger.silly('Unable to pull products in category');
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
        logger.silly('Unable to find matching product');
        const error = new Error('Product Not Found');
        error.status = ErrorCodes.ProductNotFound;
        throw error;
      }

      this.context.task.product.name = capitalizeFirstLetter(matchedProduct.name);
      this.context.task.product.price = matchedProduct.price;
      this.context.task.product.style = matchedProduct.id;

      this.context.jar.setCookieSync('hasVisited=1;', this.context.task.store.url);
      this.context.jar.setCookieSync(
        `lastVisitedFragment=products/${this.context.task.product.style};`,
        this.context.task.store.url,
      );

      emitEvent(
        this.context,
        this.context.ids,
        {
          productName: `${this.context.task.product.name}`,
        },
        Events.MonitorStatus,
      );

      return States.STOCK;
    } catch (error) {
      return this._handleError(error, States.PARSE);
    }
  }

  async _handleStock() {
    const { task, aborted, proxy, logger } = this.context;
    const { style } = task.product;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    // only emit the status update on first fetch
    if (!this.context.task.product.styles) {
      emitEvent(
        this.context,
        this.context.ids,
        {
          message: 'Fetching stock',
        },
        Events.MonitorStatus,
      );
    }

    try {
      const res = await this._fetch(`/shop/${style}.json`, {
        method: 'GET',
        agent: proxy ? proxy.proxy : null,
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

      this.context.task.product.styles = styles;

      const now = new Date().getTime();
      this.context.jar.setCookieSync(`shoppingSessionId=${now};`, this.context.task.store.url);

      this._delayer = waitForDelay(this.context.task.monitor, this._aborter.signal);
      await this._delayer;

      return States.STOCK;
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
      [States.SWAP]: this._handleSwap,
      [States.DONE]: () => States.ABORT,
      [States.ERROR]: () => States.ABORT,
      [States.ABORT]: () => States.ABORT,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }

  stop(id) {
    super.stop(id);

    if (this.context.isEmpty()) {
      clearInterval(this._pookyInterval);
      this._pookyInterval = null;
    }
  }
}
