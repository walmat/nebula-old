/* eslint-disable consistent-return */
/* eslint-disable array-callback-return */
import { Task, Regions } from '../constants';
import notification from '../hooks';
import getHeaders, { getRegion, Forms, pickVariant } from '../utils';
import { Utils, Bases, Classes, Constants } from '../../common';

const { cart, backupForm } = Forms;
const { Manager, Task: TaskConstants, Platforms } = Constants;
const { Events: TaskManagerEvents } = Manager;
const { States } = Task;
const { Events } = TaskConstants;
const { BaseTask } = Bases;
const { emitEvent, waitForDelay } = Utils;
const { Timer, Captcha } = Classes;

// SUPREME
export default class TaskPrimitive extends BaseTask {
  constructor(context, platform = Platforms.Supreme) {
    super(context, platform);

    // internals
    this._sentWebhook = false;
    this._state = States.WAIT_FOR_PRODUCT;
    this._prevState = this._state;
    this._timer = new Timer();
    this._region = getRegion(context.task.store.name);
    this._pooky = false;
    this._slug = null;
    this._form = null;
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

    if (this._context.task.product.variants) {
      const variant = await pickVariant(this._context);
      // maybe we should loop back around?
      if (!variant) {
        emitEvent(
          this._context,
          this._context.ids,
          {
            message: 'No sizes found',
          },
          Events.TaskStatus,
        );

        return States.ERROR;
      }

      logger.debug('Chose variant: %j', variant);
      this._context.updateVariant(variant);
      this._context.setProductFound(true);
      return States.ADD_TO_CART;
    }

    this._delayer = waitForDelay(500, this._aborter.signal);
    await this._delayer;

    return States.WAIT_FOR_PRODUCT;
  }

  async generatePooky(region = Regions.US) {
    const { NEBULA_API_BASE, NEBULA_API_UUID } = process.env;

    const regionMap = {
      [Regions.EU]: 'EU',
      [Regions.JP]: 'JP',
      [Regions.US]: 'NA',
    };

    try {
      const res = await this._fetch(
        `${NEBULA_API_BASE}?key=${NEBULA_API_UUID}&region=${regionMap[region]}`,
      );

      const { status } = res;
      if (!res.ok) {
        if (status === 404) {
          // pooky disabled flag...
          return true;
        }
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

      const { jar, task } = this._context;

      return body.map(({ name, value }) => jar.setCookieSync(`${name}=${value};`, task.store.url));
    } catch (err) {
      throw err;
    }
  }

  async _handleAddToCart() {
    const { aborted, proxy, logger } = this._context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const {
      product: {
        id: st,
        variant: { id: s },
      },
      monitor,
      captcha,
    } = this._context.task;

    emitEvent(
      this._context,
      this._context.ids,
      {
        message: 'Adding to cart',
      },
      Events.TaskStatus,
    );

    if (!this._pooky) {
      try {
        this._pooky = await this.generatePooky(this._region);
      } catch (error) {
        // TODO!
      }
    }

    try {
      const res = await this._fetch(`/shop/${s}/add.json`, {
        method: 'POST',
        agent: proxy ? proxy.proxy : null,
        headers: {
          ...getHeaders(),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: cart(s, st, this._region),
      });

      if (!res.ok) {
        const error = new Error('Failed add to cart');
        error.status = res.status || res.errno;
        throw error;
      }

      // start the padding timer...
      this._timer.start(new Date().getTime());

      const body = await res.json();

      if ((body && !body.length) || (body && body.length && !body[0].in_stock)) {
        emitEvent(
          this._context,
          this._context.ids,
          {
            message: `Out of stock, delaying ${monitor}ms`,
          },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;
        emitEvent(
          this._context,
          this._context.ids,
          {
            message: `Adding to cart`,
          },
          Events.TaskStatus,
        );

        return States.ADD_TO_CART;
      }

      if (captcha && !this.captchaToken) {
        return States.CAPTCHA;
      }

      return States.SUBMIT_CHECKOUT;
    } catch (error) {
      return this._handleError(error, States.ADD_TO_CART);
    }
  }

  async _handleCaptcha() {
    const { aborted, logger } = this._context;
    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      if (this._context.captchaRequest) {
        // cancel the request if it was previously started
        this._context.captchaRequest.cancel('aborted');
      }
      return States.ABORT;
    }

    // start request if it hasn't started already
    if (!this._context.captchaRequest) {
      emitEvent(
        this._context,
        this._context.ids,
        {
          message: 'Waiting for captcha',
        },
        Events.TaskStatus,
      );

      const requester = await Captcha.getCaptcha(
        this._context,
        this._handleHarvest,
        this._platform,
      );
      this._context.setCaptchaRequest(requester);
    }

    // Check the status of the request
    switch (this._context.captchaRequest.status) {
      case 'pending': {
        // waiting for token, sleep for 1s and then return same state to check again
        await new Promise(resolve => setTimeout(resolve, 1000));
        return States.CAPTCHA;
      }
      case 'fulfilled': {
        // token was returned, store it and remove the request
        const { value } = this._context.captchaRequest;
        this._context.setCaptchaToken(value);
        this._context.setCaptchaRequest(null);
        // We have the token, so suspend harvesting for now
        Captcha.suspendHarvestCaptcha(this._context, this._platform);

        emitEvent(
          this._context,
          this._context.ids,
          {
            message: 'Submitting checkout',
          },
          Events.TaskStatus,
        );

        return States.SUBMIT_CHECKOUT;
      }
      case 'cancelled':
      case 'destroyed': {
        logger.silly(
          'Harvest Captcha status: %s, stopping...',
          this._context.captchaRequest.status,
        );
        return States.ERROR;
      }
      default: {
        logger.silly(
          'Unknown Harvest Captcha status! %s, stopping...',
          this._context.captchaRequest.status,
        );
        return States.ERROR;
      }
    }
  }

  async _handleSubmitCheckout() {
    const {
      aborted,
      logger,
      proxy,
      task: { checkoutDelay, monitor },
    } = this._context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (!this._form) {
      const {
        profile: { payment, shipping, billing, billingMatchesShipping },
        product: {
          variant: { id: s },
        },
      } = this._context.task;

      const profileInfo = billingMatchesShipping ? shipping : billing;
      this._form = backupForm(this._region, profileInfo, payment, s);

      // patch in the captcha token
      if (this._context.captchaToken) {
        this._form += `&g-recaptcha-response=${this._context.captchaToken}`;
      }
    }

    if (!this._pooky) {
      try {
        this._pooky = await this.generatePooky(this._region);
      } catch (error) {
        // TODO!
      }
    }

    // stop the padding timer...
    this._timer.stop(new Date().getTime());

    const totalTimeout = checkoutDelay - this._timer.getTotalTime(0);
    if (totalTimeout && totalTimeout > 0) {
      emitEvent(
        this._context,
        this._context.ids,
        {
          message: `Delaying ${totalTimeout}ms`,
        },
        Events.TaskStatus,
      );

      this._delayer = waitForDelay(totalTimeout, this._aborter.signal);
      await this._delayer;
    }

    logger.info('parsed form: %j', this._form);

    emitEvent(
      this._context,
      this._context.ids,
      {
        message: 'Submitting checkout',
      },
      Events.TaskStatus,
    );

    try {
      const res = await this._fetch('/checkout.json', {
        method: 'POST',
        agent: proxy ? proxy.proxy : null,
        headers: {
          ...getHeaders(),
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: this._form,
      });

      if (!res.ok) {
        const error = new Error('Failed submitting checkout');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();
      console.log(body);
      if (body && body.status && /queued/i.test(body.status)) {
        const { slug } = body;
        if (!slug) {
          emitEvent(
            this._context,
            this._context.ids,
            {
              message: 'Invalid slug',
            },
            Events.TaskStatus,
          );
          return States.SUBMIT_CHECKOUT;
        }

        this._slug = slug;
        return States.CHECK_STATUS;
      }

      if (body && body.status && /out/i.test(body.status)) {
        emitEvent(
          this._context,
          this._context.ids,
          {
            message: `Out of stock! Delaying ${monitor}ms`,
          },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;

        emitEvent(
          this._context,
          this._context.ids,
          {
            message: 'Submitting checkout',
          },
          Events.TaskStatus,
        );

        return States.SUBMIT_CHECKOUT;
      }

      if (body && body.status && /dup/i.test(body.status)) {
        emitEvent(
          this._context,
          this._context.ids,
          {
            message: 'Duplicate order',
          },
          Events.TaskStatus,
        );

        return States.DONE;
      }

      if (body && body.status && /failed/i.test(body.status)) {
        emitEvent(
          this._context,
          this._context.ids,
          {
            message: `Checkout failed!`,
          },
          Events.TaskStatus,
        );

        this._context.task.checkoutDelay += 250;
        return States.ADD_TO_CART;
      }

      return States.SUBMIT_CHECKOUT;
    } catch (error) {
      if (/invalid json/i.test(error)) {
        return States.ADD_TO_CART;
      }
      return this._handleError(error, States.SUBMIT_CHECKOUT);
    }
  }

  async _handleCheckStatus() {
    const { aborted, logger, proxy, events } = this._context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    emitEvent(
      this._context,
      this._context.ids,
      {
        message: `Checking status`,
      },
      Events.TaskStatus,
    );

    try {
      const res = await this._fetch(`/checkout/${this._slug}/status.json`, {
        method: 'GET',
        agent: proxy ? proxy.proxy : null,
        headers: {
          ...getHeaders(),
          'content-type': 'application/x-www-form-urlencoded',
        },
      });

      if (!res.ok) {
        const error = new Error('Failed checking order status');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();

      if (body && body.status && /failed|out/i.test(body.status)) {
        emitEvent(
          this._context,
          this._context.ids,
          {
            message: `Checkout failed`,
          },
          Events.TaskStatus,
        );

        const {
          task: {
            product: {
              name: productName,
              image,
              price,
              currency,
              variant: { name: size },
            },
            store: { name: storeName, url: storeUrl },
            profile: { profileName },
          },
          slack,
          discord,
        } = this._context;

        if (!this._sentWebhook) {
          this._sentWebhook = true;
          const hooks = await notification(slack, discord, {
            success: false,
            product: productName,
            price: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
              price.toString().slice(0, -2),
            ),
            store: { name: storeName, url: storeUrl },
            profile: profileName,
            size,
            image: `${image}`.startsWith('http') ? image : `https:${image}`,
          });

          // emit the webhook event
          events.emit(TaskManagerEvents.Webhook, hooks);
        }

        this._context.setCaptchaToken(null);
        this._context.task.checkoutDelay = 0;

        if (this._region === Regions.US) {
          emitEvent(
            this._context,
            this._context.ids,
            {
              message: `Delaying ${this._context.task.monitor}ms`,
            },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(this._context.task.monitor, this._aborter.signal);
          await this._delayer;

          return States.SUBMIT_CHECKOUT;
        }

        return States.CAPTCHA;
      }

      if (body && body.status && /paid/i.test(body.status)) {
        emitEvent(
          this._context,
          this._context.ids,
          {
            message: 'Payment successful',
          },
          Events.TaskStatus,
        );

        const {
          task: {
            product: {
              name: productName,
              image,
              price,
              currency,
              variant: { name: size },
            },
            store: { name: storeName, url: storeUrl },
            profile: { profileName },
          },
          slack,
          discord,
        } = this._context;

        const hooks = await notification(slack, discord, {
          success: true,
          product: productName,
          price: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
            price.toString().slice(0, -2),
          ),
          store: { name: storeName, url: storeUrl },
          profile: profileName,
          size,
          image: `${image}`.startsWith('http') ? image : `https:${image}`,
        });

        events.emit(TaskManagerEvents.Webhook, hooks);
        return States.DONE;
      }

      this._delayer = waitForDelay(1000, this._aborter.signal);
      await this._delayer;

      emitEvent(
        this._context,
        this._context.ids,
        {
          message: 'Checking status',
        },
        Events.TaskStatus,
      );

      return States.CHECK_STATUS;
    } catch (error) {
      return this._handleError(error, States.CHECK_STATUS);
    }
  }

  async _handleStepLogic(currentState) {
    const { logger } = this._context;

    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.WAIT_FOR_PRODUCT]: this._handleWaitForProduct,
      [States.ADD_TO_CART]: this._handleAddToCart,
      [States.CAPTCHA]: this._handleCaptcha,
      [States.SUBMIT_CHECKOUT]: this._handleSubmitCheckout,
      [States.CHECK_STATUS]: this._handleCheckStatus,
      [States.SWAP]: this._handleSwap,
      [States.DONE]: () => States.DONE,
      [States.ERROR]: () => States.DONE,
      [States.ABORT]: () => States.DONE,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }
}

TaskPrimitive.Events = Events;
TaskPrimitive.States = States;
