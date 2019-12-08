import fetch from 'node-fetch';

import { Monitor } from '../constants';
import { Bases, Constants, Utils } from '../../common';
import { pickVariant } from '../utils';

const { States } = Monitor;
const { Platforms, Task: TaskConstants, ErrorCodes } = Constants;
const { BaseMonitor } = Bases;
const { emitEvent, waitForDelay } = Utils;
const { Events } = TaskConstants;

export default class MonitorPrimitive extends BaseMonitor {
  constructor(context, platform = Platforms.Footsites) {
    super(context, platform);
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
          message: `${status}! Delaying ${this.context.task.error}ms (${status})`,
        },
        Events.MonitorStatus,
      );
      this._delayer = waitForDelay(this.context.task.error, this._aborter.signal);
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

  // todo.. handler functions here
  async _handleStock() {
    const { aborted, task, proxy, logger } = this.context;
    const { product, size } = task;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    emitEvent(
      this.context,
      this.context.ids,
      {
        message: 'Getting Product Data',
      },
      Events.MonitorStatus,
    );

    try {
      // get product data
      const res = await this._fetch(
        `/api/products/pdp/${product.variant}?timestamp=${Date.now()}`,
        {
          method: 'get',
          agent: proxy ? proxy.proxy : null,
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate, br',
            'Accept-language': 'en-US,en;q=0.9',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.75 Safari/537.36',
          },
        },
      );

      if (!res.ok) {
        logger.silly('Stock Error');
        const error = new Error('Error getting stock');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();
      // logger.silly(`Body ${JSON.stringify(body)}`);

      const { sellableUnits, variantAttributes, name } = body;
      if (!sellableUnits) {
        logger.silly('No sellable units');
        const error = new Error('No sellable units');
        error.status = res.status || res.errno;
        throw error;
      }

      task.product.name = name;

      // check if available
      if (Date.now(variantAttributes[0].skuLaunchDate) > Date.now()) {
        // wait until launch
      }

      const pickedVariant = await pickVariant(sellableUnits, size);
      task.product.id = pickedVariant.code;
      // TODO: uncommenting these are currently causing errors
      // task.product.currency = pickVariant.price.currencyIso;
      // task.product.price = pickVariant.price.value;
      // task.product.image = body.images[0].url;
      logger.silly(`Product found: ${name}`);
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
      logger.silly(error);
      return this._handleError(error, States.STOCK);
    }
  }

  async _handleStepLogic(currentState) {
    const { logger } = this._context;

    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Monitor Handling state: %s', currentState);

    const stepMap = {
      // ... map state to handler function here
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
