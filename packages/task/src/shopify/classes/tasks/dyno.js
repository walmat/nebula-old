/* eslint-disable no-nested-ternary */
import { parse } from 'query-string';

import TaskPrimitive from './base';
import { Utils, Constants } from '../../../common';
import { Task as TaskConstants } from '../../constants';
import { stateForError, getHeaders } from '../../utils';

const { Task } = Constants;
const { userAgent, waitForDelay, emitEvent } = Utils;

const { Events } = Task;
const { States } = TaskConstants;

export default class DynoTaskPrimitive extends TaskPrimitive {
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

    return States.WAIT_FOR_PRODUCT;
  }

  async _handleLogin() {
    const nextState = await super._handleLogin();

    if (nextState === States.DONE) {
      return States.WAIT_FOR_PRODUCT;
    }
    return nextState;
  }

  async _handleAddToCart() {
    const nextState = await super._handleAddToCart();

    if (nextState === States.DONE) {
      return States.CREATE_CHECKOUT;
    }

    return nextState;
  }

  async _handleCreateCheckout() {
    if (!this._form.includes('checkout')) {
      this._form += `checkout=Check+out`;
    }

    const { nextState, data } = await this._handler(
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
    );

    this._form = '';

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
      [States.QUEUE]: this._handlePollQueue,
      [States.WAIT_FOR_PRODUCT]: this._handleWaitForProduct,
      [States.ADD_TO_CART]: this._handleAddToCart,
      [States.GO_TO_CART]: this._handleGoToCart,
      [States.GO_TO_CHECKOUT]: this._handleGetCheckout,
      [States.CAPTCHA]: this._handleCaptcha,
      [States.SUBMIT_CUSTOMER]: this._handleSubmitCustomer,
      [States.GO_TO_SHIPPING]: this._handleGetShipping,
      [States.SUBMIT_SHIPPING]: this._handleSubmitShipping,
      [States.GO_TO_PAYMENT]: this._handleGetPayment,
      [States.PAYMENT_TOKEN]: this._handlePaymentToken,
      [States.SUBMIT_PAYMENT]: this._handleSubmitPayment,
      [States.COMPLETE_PAYMENT]: this._handleCompletePayment,
      [States.PROCESS_PAYMENT]: this._handlePaymentProcess,
      [States.SWAP]: this._handleSwap,
      [States.DONE]: () => States.DONE,
      [States.ERROR]: () => States.DONE,
      [States.ABORT]: () => States.DONE,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }
}
