import { min } from 'lodash';

import { Utils, Constants } from '../../../common';
import { Task as TaskConstants } from '../../constants';
import { Forms } from '../../utils';

import TaskPrimitive from './base';

const { Task } = Constants;
const { patchCheckoutForm } = Forms;
const { emitEvent, waitForDelay } = Utils;

const { Events } = Task;
const { States } = TaskConstants;

export default class FastTaskPrimitive extends TaskPrimitive {
  constructor(context) {
    super(context, States.GATHER_DATA);

    this._setup = false;
  }

  async _handleGatherData() {
    const nextState = await super._handleGatherData();

    if (nextState !== States.DONE) {
      return nextState;
    }

    return States.CREATE_CHECKOUT;
  }

  async _handleLogin() {
    const nextState = await super._handleLogin();

    if (nextState === States.DONE) {
      return States.GATHER_DATA;
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
          state: States.SUBMIT_CUSTOMER,
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

  async _handleSubmitCheckpoint() {
    const nextState = await super._handleSubmitCheckpoint();

    if (nextState === States.GO_TO_CART) {
      return States.CREATE_CHECKOUT;
    }

    return nextState;
  }

  async _handleSubmitCustomer() {
    if (this._setup) {
      return super._handleSubmitCustomer();
    }

    const { shipping, billing, payment, matches } = this.context.task.profile;

    const { nextState, data } = await this._handler(
      `/wallets/checkouts/${this._hash}.json`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(
          patchCheckoutForm(matches, shipping, billing, payment, this.context.captchaToken),
        ),
      },
      'Submitting information',
      States.SUBMIT_CUSTOMER,
      [
        {
          url: 'throttle',
          message: 'Polling queue',
          state: States.QUEUE,
        },
        {
          url: 'password',
          message: 'Submitting information',
          state: States.SUBMIT_CUSTOMER,
        },
      ],
    );

    if (nextState) {
      return nextState;
    }

    const body = await data.json();

    if (
      body &&
      body.checkout &&
      !(body.checkout.shipping_address || body.checkout.billing_address)
    ) {
      return States.SUBMIT_CUSTOMER;
    }

    this._setup = true;
    return States.WAIT_FOR_PRODUCT;
  }

  async _handleAddToCart() {
    const nextState = await super._handleAddToCart();

    if (nextState !== States.DONE) {
      return nextState;
    }

    this.generateSessions();

    return States.GO_TO_CHECKOUT;
  }

  // async _handleGetCheckout() {
  //   const nextState = await super._handleGetCheckout();

  //   if (nextState === States.SUBMIT_CUSTOMER && !this._setup) {
  //     return States.GO_TO_SHIPPING;
  //   }

  //   return nextState;
  // }

  async _handleGetShipping() {
    const {
      task: {
        captcha,
        store: { url },
      },
      captchaToken,
    } = this.context;

    if (!/eflash-sg|eflash-jp/i.test(url)) {
      return super._handleGetShipping();
    }

    const { data } = await this._handler(
      `/wallets/checkouts/${this._hash}/shipping_rates.json`,
      {},
      'Fetching rates',
      States.GO_TO_SHIPPING,
    );

    const { status } = data;

    if (status === 422) {
      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Unsupported country' },
        Events.TaskStatus,
      );

      return States.ERROR;
    }

    const body = await data.json();
    if (body && body.errors) {
      const { checkout } = body.errors;
      if (checkout) {
        const errorMessage = JSON.stringify(checkout);
        if (errorMessage.indexOf('does_not_require_shipping') > -1) {
          return States.ADD_TO_CART;
        }

        if (errorMessage.indexOf("can't be blank") > -1) {
          return States.SUBMIT_CUSTOMER;
        }
      }
    }

    if (body && body.shipping_rates && body.shipping_rates.length > 0) {
      const { shipping_rates: shippingRates } = body;

      const cheapest = min(shippingRates, rate => rate.price);
      this._selectedShippingRate = { id: cheapest.id, name: cheapest.title };

      if (captcha && !captchaToken) {
        return States.CAPTCHA;
      }

      if (!/eflash-sg|eflash-jp/i.test(url)) {
        return States.SUBMIT_SHIPPING;
      }
      return States.SUBMIT_CHECKOUT;
    }

    this._delayer = waitForDelay(150, this._aborter.signal);
    await this._delayer;

    return States.GO_TO_SHIPPING;
  }

  async _handleSubmitCheckout() {
    const {
      task: {
        captcha,
        store: { url },
      },
      captchaToken,
    } = this.context;

    if (!/eflash-sg|eflash-jp/i.test(url)) {
      if (!this._token) {
        this._token = this._tokens.shift();
      }

      return super._handleSubmitCheckout();
    }

    const { id } = this._selectedShippingRate;
    const form = {
      complete: 1,
      s: this._token,
      checkout: {
        shipping_rate: {
          id,
        },
      },
    };

    if (captchaToken) {
      form['g-recaptcha-response'] = captchaToken;
    }

    const { nextState, data } = await this._handler(
      `/${this._store}/checkouts/${this._hash}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'applcation/json',
        },
        body: JSON.stringify(form),
      },
      'Submitting checkout',
      States.SUBMIT_CHECKOUT,
      [
        {
          url: 'processing',
          message: 'Checking order',
          state: States.CHECK_ORDER,
        },
        {
          url: 'checkpoint',
          message: 'Going to checkpoint',
          state: States.GO_TO_CHECKPOINT,
        },
        {
          url: 'password',
          message: 'Submitting checkout',
          state: States.SUBMIT_CHECKOUT,
        },
        {
          url: 'throttle',
          message: 'Polling queue',
          state: States.QUEUE,
        },
        {
          url: 'stock_problems',
          message: 'Submitting checkout',
          state: States.COMPLETE_CHECKOUT,
        },
      ],
    );

    if (nextState) {
      return nextState;
    }

    const body = await data.text();

    if ((/captcha/i.test(body) || captcha) && !captchaToken) {
      return States.CAPTCHA;
    }

    const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);

    if (!match || (match && !match.length)) {
      return States.SUBMIT_CHECKOUT;
    }

    const [, step] = match;
    if (/review/i.test(step)) {
      return States.COMPLETE_CHECKOUT;
    }

    if (/payment|stock_problems/i.test(step)) {
      return States.SUBMIT_CHECKOUT;
    }

    if (/shipping/i.test(step)) {
      return States.SUBMIT_SHIPPING;
    }

    if (/process/i.test(step)) {
      return States.CHECK_ORDER;
    }

    return States.SUBMIT_CHECKOUT;
  }

  async _handleCompleteCheckout() {
    const {
      task: { captcha },
      captchaToken,
    } = this.context;

    const form = { complete: 1 };

    if (captchaToken) {
      form['g-recaptcha-response'] = captchaToken;
    }

    const { nextState, data } = await this._handler(
      `/${this._store}/checkouts/${this._hash}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'applcation/json',
        },
        body: JSON.stringify(form),
      },
      'Submitting checkout',
      States.COMPLETE_CHECKOUT,
      [
        {
          url: 'processing',
          message: 'Checking order',
          state: States.CHECK_ORDER,
        },
        {
          url: 'checkpoint',
          message: 'Going to checkpoint',
          state: States.GO_TO_CHECKPOINT,
        },
        {
          url: 'password',
          message: 'Submitting checkout',
          state: States.COMPLETE_CHECKOUT,
        },
        {
          url: 'throttle',
          message: 'Polling queue',
          state: States.QUEUE,
        },
        {
          url: 'stock_problems',
          message: 'Submitting checkout',
          state: States.COMPLETE_CHECKOUT,
        },
      ],
    );

    if (nextState) {
      return nextState;
    }

    const body = await data.text();
    if ((/captcha/i.test(body) || captcha) && !captchaToken) {
      return States.CAPTCHA;
    }

    const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);

    if (!match || (match && !match.length)) {
      return States.SUBMIT_CHECKOUT;
    }

    const [, step] = match;
    if (/review/i.test(step)) {
      return States.COMPLETE_CHECKOUT;
    }

    if (/payment|stock_problems/i.test(step)) {
      return States.SUBMIT_CHECKOUT;
    }

    if (/shipping/i.test(step)) {
      return States.SUBMIT_SHIPPING;
    }

    if (/process/i.test(step)) {
      return States.CHECK_ORDER;
    }

    return States.COMPLETE_CHECKOUT;
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

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
