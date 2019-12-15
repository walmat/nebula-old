import cloudscraper from 'cloudscraper';

import { Monitor } from '../constants';
import { Bases, Constants, Utils } from '../../common';

const { States } = Monitor;
const { Platforms, Task: TaskConstants, ErrorCodes } = Constants;
const { BaseMonitor } = Bases;
const { emitEvent, waitForDelay } = Utils;
const { Events } = TaskConstants;

export default class MonitorPrimitive extends BaseMonitor {
  constructor(context, platform = Platforms.YeezySupply) {
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

  async _handleParse() {
    const { aborted, task, proxy, logger } = this.context;
    const { product } = task;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    logger.silly('finding product')

    emitEvent(
      this.context,
      this.context.ids,
      {
        message: 'Finding Product',
      },
      Events.MonitorStatus,
    );

    try {
      const res = await cloudscraper(`https://yeezysupply.com/api/products/${product.variant}`, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.75 Safari/537.36',
        },
      });

      const body = await JSON.parse(res);

      logger.silly(body);

      return States.STOCK;
    } catch (error) {
      logger.silly(error);
      return this._handleError(error, States.STOCK);
    }
  }

  async _handleStock() {
    const { aborted, task, proxy, logger } = this.context;
    const { product } = task;

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
      const res = await cloudscraper(
        // `https://jsonplaceholder.typicode.com/todos/1`,
        `https://yeezysupply.com/api/products/${product.variant}/availability`,
        {
          method: 'GET',
          // agent: proxy ? proxy.proxy : null,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.75 Safari/537.36',
          },
        },
      );

      // if (!res.ok) {
      //   const error = new Error('Error getting stock');
      //   error.status = res.status || res.errno;
      //   throw error;
      // }

      // task.product.b = body;

      // if (!body) {
      //   const error = new Error('No product data');
      //   error.status = res.status || res.errno;
      //   throw error;
      // }
      let b = await JSON.parse(res);

      logger.silly(b);

      // if (body.availability_status === 'PREVIEW') {
      //   // do something when not avaliable yet
      // }

      // if (body.availability_status === 'IN_STOCK') {
      //   logger.silly(body);
      // }

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
