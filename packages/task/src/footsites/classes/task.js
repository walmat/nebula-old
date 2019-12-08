import { Task } from '../constants';
import { Bases, Constants, Utils } from '../../common';

const { States } = Task;
const { Platforms, Task: TaskConstants } = Constants;
const { BaseTask } = Bases;
const { Events } = TaskConstants;
const { emitEvent, waitForDelay } = Utils;

export default class TaskPrimitive extends BaseTask {
  constructor(context, platform = Platforms.Footsites) {
    super(context, platform);
  }

  async _handleError(error = {}, state) {
    const { aborted, logger } = this._context;
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
    }

    if (/(?!([235][0-9]))\d{3}/g.test(status)) {
      emitEvent(
        this._context,
        this._context.ids,
        {
          message: `Delaying ${this._context.task.error}ms (${status})`,
        },
        Events.TaskStatus,
      );

      this._delayer = waitForDelay(this._context.task.error, this._aborter.signal);
      await this._delayer;
    }

    return state;
  }

  async generateCookies() {
    //Basically just edited version of getPooky for now, very incomplete
    const { jar, task } = this._context;
    const { NEBULA_API_BASE, NEBULA_API_UUID } = process.env;

    try {
      const res = await this._fetch(
        `${NEBULA_API_BASE}?key=${NEBULA_API_UUID}&storeurl=${task.store.url}`,
      );

      if (!res.ok) {
        const error = new Error('Unable to fetch cookies');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();
      if (!body || (body && !body.length)) {
        const error = new Error('Invalid cookie list');
        error.status = res.status || res.errno;
        throw error;
      }

      return body.map(({ name, value }) => jar.setCookieSync(`${name}=${value};`, task.store.url));
    } catch (e) {
      throw e;
    }
  }

  async getCSRF() {
    try {
      const res = await this._fetch(`api/session?timestamp=${Date.now()}`, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.75 Safari/537.36'
        }
      });

      if (!res.ok) {
        const error = new Error('Unable to fetch cookies');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();
      if (!body || (body && !body.length)) {
        const error = new Error('Invalid cookie list');
        error.status = res.status || res.errno;
        throw error;
      }

      return res.data.csrfToken;
    } catch (e) {
      throw e;
    }
  }

  async _handleWaitForProduct() {
    const { aborted, logger } = this._context;
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._context.task.product.id) {
      logger.debug('Chose variant: %j', this._context.task.product.id);
      this._context.setProductFond(true);
      return States.ADD_TO_CART;
    }
    // return States.ADD_TO_CART;

    this._delayer = waitForDelay(500, this._aborter.signal);
    logger.silly('have not found product');
    await this._delayer;

    return States.WAIT_FOR_PRODUCT;
  }

  async _handleAddToCart() {
    const { aborted, logger, task } = this._context;

    logger.silly('adding to cart');

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      emitEvent(
        this.context,
        this.context.id,
        {
          message: 'Adding to cart',
        },
        Events.TaskStatus,
      );

      let postData = {
        productId: task.product.id,
        productQuantity: 1,
      };

      let csrf = await this.getCSRF();

      // incomplete but will send ATC request
      let res = await this._fetch(`/api/users/carts/current/entries?timestamp=${Date.now()}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          'x-csrf-token': csrf,
          'x-fl-productid': task.product.id,
        },
        body: JSON.stringify(postData)
      });

      if (!res.ok) {
        const error = new Error('Failed add to cart');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();

    } catch (e) {
      return this._handleError(e, States.ADD_TO_CART);
    }

    return States.DONE;
  }

  async _handleStepLogic(currentState) {
    const { logger } = this._context;

    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Task Handling state: %s', currentState);

    const stepMap = {
      [States.WAIT_FOR_PRODUCT]: this._handleWaitForProduct,
      [States.ADD_TO_CART]: this._handleAddToCart,
      [States.SWAP]: this._handleSwapProxies,
      [States.DONE]: () => States.DONE,
      [States.ERROR]: () => States.DONE,
      [States.ABORT]: () => States.DONE,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }
}
