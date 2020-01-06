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

    if (this.context.task.account) {
      return States.LOGIN;
    }

    return States.CREATE_CHECKOUT;
  }

  async _handleLogin() {
    const nextState = await super._handleLogin();

    if (nextState === States.DONE) {
      if (this.context.task.product.variants) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Adding to cart' },
          Events.TaskStatus,
        );
        return States.ADD_TO_CART;
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Waiting for product' },
        Events.TaskStatus,
      );
      return States.CREATE_CHECKOUT;
    }
    return nextState;
  }

  async _handleCreateCheckout() {
    const { nextState, data } = await this._handler(
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
    );

    if (nextState) {
      return nextState;
    }

    const { status } = data;

    const message = status ? `Creating checkout (${status})` : 'Creating checkout';
    emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
    return States.CREATE_CHECKOUT;
  }

  async _handleSubmitCustomer() {
    const nextState = await super._handleSubmitCustomer();

    if (nextState !== States.DONE) {
      return nextState;
    }

    if (!this._selectedShippingRate.id) {
      return States.GO_TO_SHIPPING;
    }

    const { id } = this._selectedShippingRate;

    this._form = `_method=patch&authenticity_token=&previous_step=shipping_method&step=payment_method&checkout%5Bshipping_rate%5D%5Bid%5D=${encodeURIComponent(
      id,
    )}&button=&checkout%5Bclient_details%5D%5Bbrowser_width%5D=927&checkout%5Bclient_details%5D%5Bbrowser_height%5D=967&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1`;
    return States.SUBMIT_SHIPPING;
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
      [States.CAPTCHA]: this._handleCaptcha,
      [States.GO_TO_CHECKOUT]: this._handleGetCheckout,
      [States.SUBMIT_CUSTOMER]: this._handleSubmitCustomer,
      [States.GO_TO_SHIPPING]: this._handleGetShipping,
      [States.SUBMIT_SHIPPING]: this._handleSubmitShipping,
      [States.PAYMENT_SESSION]: this._handleGenerateSession,
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
