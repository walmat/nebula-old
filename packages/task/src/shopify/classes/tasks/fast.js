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
      return States.CREATE_CHECKOUT;
    }

    return nextState;
  }

  async _handleCreateCheckout() {
    const { monitor } = this.context.task;

    const { nextState, data } = await this._handler(
      '/wallets/checkouts',
      {
        method: 'POST',
        body: JSON.stringify({
          card_source: 'vault',
          pollingOptions: {
            poll: false,
          },
          complete: '1',
          checkout: {
            secret: true,
            wallet_name: 'default',
          },
        }),
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
          message: 'Create checkout',
          state: States.CREATE_CHECKOUT,
        },
        {
          url: 'throttle',
          message: 'Polling queue',
          state: States.QUEUE,
        },
      ],
    );

    if (nextState) {
      return nextState;
    }

    const body = await data.json();

    if (body && body.error) {
      if (/channel is locked/i.test(body.error)) {
        emitEvent(this.context, [this.context.id], { message: 'Password page' }, Events.TaskStatus);

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;

        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Creating checkout' },
          Events.TaskStatus,
        );
        return States.CREATE_CHECKOUT;
      }

      return States.CREATE_CHECKOUT;
    }

    if (body && body.checkout) {
      const { token } = body.checkout;
      if (token) {
        this._hash = token;
        return States.SUBMIT_CUSTOMER;
      }

      const { web_url: checkoutUrl } = body.checkout;

      if (/checkouts/i.test(checkoutUrl)) {
        const noQs = checkoutUrl.split('?');
        [, , , this._store, , this._hash] = noQs.split('/');
        return States.SUBMIT_CUSTOMER;
      }

      return States.CREATE_CHECKOUT;
    }

    const { status } = data;
    const message = status ? `Creating checkout (${status})` : 'Creating checkout';
    emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
    return States.CREATE_CHECKOUT;
  }

  async _handleSubmitCustomer() {
    const { shipping, billing, payment, matches } = this.context.task.profile;

    const { nextState, data } = await this._handler(
      `/wallets/checkouts/${this._hash}.json`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(patchCheckoutForm(matches, shipping, billing, payment)),
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

    return States.WAIT_FOR_PRODUCT;
  }

  async _handleAddToCart() {
    const {
      task: {
        store: { name },
        product: { hash },
        monitor,
      },
    } = this.context;

    const { id: variantId } = this._product;
    const { id: shippingId } = this._selectedShippingRate;

    let opts = {};
    const base = {
      checkout: {
        line_items: [
          {
            variant_id: variantId,
            quantity: 1,
            // eslint-disable-next-line no-nested-ternary
            properties: /dsm uk/i.test(name)
              ? {
                  _hash: hash,
                }
              : /dsm us/i.test(name)
              ? {
                  _HASH: hash,
                }
              : {},
          },
        ],
      },
    };

    if (shippingId) {
      opts = {
        shipping_rate: {
          id: shippingId,
        },
      };
    }

    const { nextState, data } = await this._handler(
      `/wallets/checkouts/${this._hash}.json`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ...base,
          checkout: {
            ...base.checkout,
            ...opts,
          },
        }),
      },
      'Adding to cart',
      States.ADD_TO_CART,
      [
        {
          url: 'password',
          message: 'Adding to cart',
          state: States.ADD_TO_CART,
        },
        {
          url: 'throttle',
          message: 'Polling queue',
          state: States.QUEUE,
        },
      ],
    );

    if (nextState) {
      return nextState;
    }

    const body = await data.json();

    if (body && body.errors && body.errors.line_items) {
      const [error] = body.errors.line_items;

      if (error && error.quantity) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: `Out of stock! Delaying ${monitor}ms` },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;

        return States.ADD_TO_CART;
      }

      if (error && error.variant_id && error.variant_id.length) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: `Variant not live! Delaying ${monitor}ms` },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;

        return States.ADD_TO_CART;
      }

      const { status } = data;
      const message = status ? `Adding to cart (${status})` : 'Adding to cart';
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.ADD_TO_CART;
    }

    if (body.checkout && body.checkout.line_items && body.checkout.line_items.length) {
      this.context.task.product.name = body.checkout.line_items[0].title;
      this.context.task.product.image = body.checkout.line_items[0].image_url.startsWith('http')
        ? body.checkout.line_items[0].image_url
        : `http:${body.checkout.line_items[0].image_url}`;

      return States.GO_TO_SHIPPING;
    }
    const { status } = data;
    const message = status ? `Adding to cart (${status})` : 'Adding to cart';
    emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
    return States.ADD_TO_CART;
  }

  async _handleGetShipping() {
    const {
      task: { captcha },
      captchaToken,
    } = this.context;

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
      return States.SUBMIT_CHECKOUT;
    }

    this._delayer = waitForDelay(150, this._aborter.signal);
    await this._delayer;

    return States.GO_TO_SHIPPING;
  }

  async _handleSubmitCheckout() {
    const {
      task: { captcha },
      captchaToken,
    } = this.context;

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
          message: 'Completing checkout',
          state: States.QUEUE,
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

  async _handleSubmitCheckpoint() {
    const nextState = await super._handleSubmitCheckpoint();

    if (nextState === States.CREATE_CHECKOUT) {
      return States.SUBMIT_CHECKOUT;
    }

    return nextState;
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
      [States.CAPTCHA]: this._handleCaptcha,
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
