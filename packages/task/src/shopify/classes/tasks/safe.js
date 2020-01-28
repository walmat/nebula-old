/* eslint-disable no-nested-ternary */
import TaskPrimitive from './base';

import { Utils, Constants } from '../../../common';
import { Task as TaskConstants } from '../../constants';

const { Task } = Constants;
const { emitEvent } = Utils;

const { Events } = Task;
const { States } = TaskConstants;

export default class SafeTaskPrimitive extends TaskPrimitive {
  constructor(context) {
    super(context, States.GATHER_DATA);
  }

  async _handleGatherData() {
    const nextState = await super._handleGatherData();

    if (nextState !== States.DONE) {
      return nextState;
    }

    return States.WAIT_FOR_PRODUCT;
  }

  async _handleLogin() {
    const nextState = await super._handleLogin();

    if (nextState === States.DONE) {
      return States.GATHER_DATA;
    }

    return nextState;
  }

  async _handleAddToCart() {
    const nextState = await super._handleAddToCart();

    if (nextState === States.DONE) {
      if (this._fromWaitForProduct) {
        return States.CAPTCHA;
      }

      // NOTE: kick off the payment session generator
      if (!this.generating) {
        this.generateSessions();
      }

      // for sites that require certain post params from cart...
      if (/palace/i.test(this.context.task.store.name)) {
        return States.GO_TO_CART;
      }
      return States.CREATE_CHECKOUT;
    }

    return nextState;
  }

  async _handleCreateCheckout() {
    let nextState;
    let data;
    if (/palace/i.test(this.context.task.store.url)) {
      if (!this._form.includes('checkout')) {
        this._form += `checkout=Check+out`;
      }

      ({ nextState, data } = await this._handler(
        '/cart',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: this._form,
        },
        'Creating checkout',
        States.CREATE_CHECKOUT,
        [
          {
            url: 'checkpoint',
            message: 'Going to checkpoint',
            state: States.GO_TO_CHECKPOINT,
          },
          {
            url: 'login',
            message: 'Account needed',
            state: States.ERROR,
          },
          {
            url: 'password',
            message: 'Creating checkout',
            state: States.CREATE_CHECKOUT,
          },
          {
            url: 'throttle',
            message: 'Polling queue',
            state: States.QUEUE,
          },
          {
            url: 'checkouts',
            message: 'Going to checkout',
            state: States.GO_TO_CHECKOUT,
          },
          {
            url: 'cart',
            message: 'Adding to cart',
            state: States.ADD_TO_CART,
          },
        ],
      ));
    } else {
      ({ nextState, data } = await this._handler(
        '/checkout',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        'Creating checkout',
        States.CREATE_CHECKOUT,
        [
          {
            url: 'checkpoint',
            message: 'Going to checkpoint',
            state: States.GO_TO_CHECKPOINT,
          },
          {
            url: 'login',
            message: 'Account needed',
            state: States.ERROR,
          },
          {
            url: 'password',
            message: 'Creating checkout',
            state: States.CREATE_CHECKOUT,
          },
          {
            url: 'throttle',
            message: 'Polling queue',
            state: States.QUEUE,
          },
          {
            url: 'checkouts',
            message: 'Going to checkout',
            state: States.GO_TO_CHECKOUT,
          },
        ],
      ));
    }

    if (nextState) {
      return nextState;
    }

    const { status } = data;

    const message = status ? `Creating checkout (${status})` : 'Creating checkout';
    emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
    return States.CREATE_CHECKOUT;
  }

  async _handleSubmitCheckpoint() {
    const nextState = await super._handleSubmitCheckpoint();

    if (nextState === States.GO_TO_CART) {
      return States.CREATE_CHECKOUT;
    }

    return nextState;
  }

  async _handleSubmitCustomer() {
    const nextState = await super._handleSubmitCustomer();

    if (nextState !== States.DONE) {
      return nextState;
    }

    return States.GO_TO_SHIPPING;
  }

  async _handleStepLogic(currentState) {
    const { logger } = this.context;
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.LOGIN]: this._handleLogin,
      [States.GATHER_DATA]: this._handleGatherData,
      [States.CREATE_CHECKOUT]: this._handleCreateCheckout,
      [States.GO_TO_CHECKPOINT]: this._handleGetCheckpoint,
      [States.SUBMIT_CHECKPOINT]: this._handleSubmitCheckpoint,
      [States.QUEUE]: this._handleQueue,
      [States.WAIT_FOR_PRODUCT]: this._handleWaitForProduct,
      [States.ADD_TO_CART]: this._handleAddToCart,
      [States.GO_TO_CART]: this._handleGetCart,
      [States.GO_TO_CHECKOUT]: this._handleGetCheckout,
      [States.CAPTCHA]: this._handleCaptcha,
      [States.SUBMIT_CUSTOMER]: this._handleSubmitCustomer,
      [States.GO_TO_SHIPPING]: this._handleGetShipping,
      [States.SUBMIT_SHIPPING]: this._handleSubmitShipping,
      [States.GO_TO_PAYMENT]: this._handleGetPayment,
      [States.SUBMIT_CHECKOUT]: this._handleSubmitCheckout,
      [States.COMPLETE_CHECKOUT]: this._handleCompleteCheckout,
      [States.CHECK_ORDER]: this._handleCheckOrder,
      [States.SWAP]: this._handleSwap,
      [States.DONE]: () => States.DONE,
      [States.ERROR]: () => States.DONE,
      [States.ABORT]: () => States.DONE,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }
}
