import fetch from 'node-fetch';

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

    logger.debug('finding product');

    try {
      const res = await fetch(
        `https://yeezysupply.com/api/products/${product.variant}/availability`,
        {
          method: 'get',
          agent: proxy ? proxy.proxy : null,
          headers: {
            Accept: '*/*',
            'Accept-encoding': 'gzip, deflate, br',
            'Accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.75 Safari/537.36',
          },
          timeout: 10000,
        },
      );

      if (!res.ok) {
        const error = new Error('Error getting stock');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();

      if (!body) {
        const error = new Error('No product data');
        error.status = res.status || res.errno;
        throw error;
      }

      if (body.availability_status === 'PREVIEW') {
        // do something when not avaliable yet
      }

      if (body.availability_status === 'IN_STOCK') {
        logger.silly(body);
      }

      return States.DONE;
    } catch (error) {
      logger.debug(error);
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
