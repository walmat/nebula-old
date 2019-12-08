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
    const { aborted, logger } = this._context;

    logger.silly('adding to cart');

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let postData = {
      productId: this._context.task.product.id,
      productQuantity: 1,
    };
    // incomplete but will send ATC request
    // this._fetch(`/api/users/carts/current/entries?timestamp=${Date.now()}`, {
    //   method: 'POST',
    //   headers: {

    //   }
    // })

    emitEvent(
      this.context,
      this.context.id,
      {
        message: 'Adding to cart',
      },
      Events.TaskStatus,
    );

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
