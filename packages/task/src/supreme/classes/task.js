import { isEmpty } from 'lodash';
import { Task, Regions } from '../constants';
import getHeaders, { getRegion, Forms, pickVariant, matchVariation } from '../utils';
import { Utils, Bases, Classes, Constants } from '../../common';

const { cart, backupForm, parseForm, FormTypes } = Forms;
const { Task: TaskConstants, Platforms } = Constants;
const { States } = Task;
const { Events } = TaskConstants;
const { BaseTask } = Bases;
const { emitEvent, waitForDelay } = Utils;
const { Captcha } = Classes;

// SUPREME
export default class TaskPrimitive extends BaseTask {
  constructor(context, platform = Platforms.Supreme) {
    super(context, States.WAIT_FOR_PRODUCT, platform);

    // internals
    this._sentWebhook = false;
    this._product = null;
    this._region = getRegion(context.task.store.name);
    this._pooky = null;
    this._slug = null;
    this._form = '';
  }

  async _handleError(error = {}, state) {
    const { aborted, logger } = this.context;
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
        this.context,
        [this.context.id],
        {
          message: `Delaying ${this.context.task.monitor}ms (${status})`,
        },
        Events.TaskStatus,
      );

      this._delayer = waitForDelay(this.context.task.monitor, this._aborter.signal);
      await this._delayer;
    }

    return state;
  }

  async _handleWaitForProduct() {
    const { aborted, logger } = this.context;
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this.context.task.product.styles) {
      const matchedVariation = await matchVariation(
        this.context.task.product.styles,
        this.context.task.variation,
        this.context.task.randomInStock,
        logger,
      );

      if (!matchedVariation) {
        emitEvent(
          this.context,
          [this.context.id],
          {
            productName: `${this.context.task.product.name}`,
            message: 'Waiting for restock',
          },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(150, this._aborter.signal);
        await this._delayer;

        return States.WAIT_FOR_PRODUCT;
      }

      this._product = {
        id: matchedVariation.id,
        variants: matchedVariation.sizes,
        currency: matchedVariation.currency,
        image: matchedVariation.swatch_url_hi || matchedVariation.image_url,
        chosenVariation: matchedVariation.name,
      };

      const variant = await pickVariant(this._product, this.context);

      if (!variant) {
        emitEvent(
          this.context,
          [this.context.id],
          {
            message: 'No size matched',
          },
          Events.TaskStatus,
        );

        return States.ERROR;
      }

      emitEvent(
        this.context,
        [this.context.id],
        {
          productImage: `${this._product.image}`.startsWith('http')
            ? this._product.image
            : `https:${this._product.image}`,
          productImageHi: `${matchedVariation.image_url}`.startsWith('http')
            ? matchedVariation.image_url
            : `https:${matchedVariation.image_url}`,
          productName: `${this.context.task.product.name} / ${this._product.chosenVariation}`,
          chosenSize: variant.name,
        },
        Events.TaskStatus,
      );
      this._product.variant = variant;
      return States.ADD_TO_CART;
    }

    this._delayer = waitForDelay(150, this._aborter.signal);
    await this._delayer;

    return States.WAIT_FOR_PRODUCT;
  }

  async generatePooky(region = Regions.US) {
    const { logger } = this.context;

    logger.info('--------------------------GENERATING POOKY--------------------------');
    const { NEBULA_API_BASE, NEBULA_API_AUTH } = process.env;

    const lastid = Date.now();
    try {
      const res = await this._fetch(`${NEBULA_API_BASE}?license=${NEBULA_API_AUTH}&site=${region}`);

      if (!res.ok) {
        const error = new Error('Unable to fetch cookies');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();
      if (!body || isEmpty(body)) {
        const error = new Error('Invalid cookies');
        error.status = res.status || res.errno;
        throw error;
      }

      this.context.jar.setCookieSync(`lastid=${lastid};`, this.context.task.store.url);
      Object.entries(body).map(([name, value]) =>
        this.context.jar.setCookieSync(`${name}=${value};`, this.context.task.store.url),
      );

      return true;
    } catch (err) {
      return false;
    }
  }

  async generateForm(type) {
    const { NEBULA_FORM_API, NEBULA_FORM_AUTH } = process.env;

    try {
      const res = await this._fetch(`${NEBULA_FORM_API}/supreme/${type}?region=${this._region}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`nebula:${NEBULA_FORM_AUTH}`).toString('base64')}`,
        },
      });

      if (!res.ok) {
        const error = new Error('Unable to fetch form');
        error.status = res.status || 404;
        throw error;
      }

      const form = await res.json();

      if (!form || (form && !form.length)) {
        return false;
      }

      this._form = await parseForm(form, type, this._product, this.context.task);

      return true;
    } catch (error) {
      return false;
    }
  }

  async _handleAddToCart() {
    const { aborted, proxy, logger } = this.context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const {
      id: st,
      variant: { id: s },
    } = this._product;

    const { randomInStock, size, monitor, captcha } = this.context.task;

    emitEvent(
      this.context,
      [this.context.id],
      {
        message: 'Adding to cart',
      },
      Events.TaskStatus,
    );

    if (!this._form) {
      const generated = await this.generateForm(FormTypes.Cart);

      // fallback to hardcoded form...
      if (!generated) {
        this._form = cart(s, st, this._region);
      }
    }

    if (!this._pooky && this.context.pookyEnabled) {
      this._pooky = await this.generatePooky(this._region);
    }

    await this._logCookies(this.context.jar);
    this.context.jar.setCookieSync('lastVisitedFragment=checkout;', this.context.task.store.url);
    await this._logCookies(this.context.jar);

    try {
      const res = await this._fetch(`/shop/${s}/add.json`, {
        method: 'POST',
        agent: proxy ? proxy.proxy : null,
        headers: {
          ...getHeaders(),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: this._form,
      });

      if (!res.ok) {
        const error = new Error('Failed add to cart');
        error.status = res.status || res.errno;
        throw error;
      }

      // start the checkout padding timer...
      this.context.timers.checkout.start(new Date().getTime());
      const body = await res.json();

      if (!body || (body && !body.length) || (body && body.length && !body[0].in_stock)) {
        emitEvent(
          this.context,
          [this.context.id],
          {
            message: `Out of stock! Delaying ${monitor}ms`,
          },
          Events.TaskStatus,
        );

        this.context.jar.removeAllCookiesSync();

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;

        emitEvent(
          this.context,
          [this.context.id],
          {
            message: `Adding to cart`,
          },
          Events.TaskStatus,
        );

        this._form = '';
        this._pooky = false;

        if (/random/i.test(size) && randomInStock) {
          return States.WAIT_FOR_PRODUCT;
        }

        return States.ADD_TO_CART;
      }

      this._form = '';
      if (captcha && !this.context.captchaToken) {
        return States.CAPTCHA;
      }

      return States.SUBMIT_CHECKOUT;
    } catch (error) {
      this._form = '';
      this._pooky = false;
      return this._handleError(error, States.ADD_TO_CART);
    }
  }

  async _handleCaptcha() {
    const { aborted, logger } = this.context;
    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      if (this.context.captchaRequest) {
        // cancel the request if it was previously started
        this.context.captchaRequest.cancel('aborted');
      }
      return States.ABORT;
    }

    // start request if it hasn't started already
    if (!this.context.captchaRequest) {
      emitEvent(
        this.context,
        [this.context.id],
        {
          message: 'Waiting for captcha',
        },
        Events.TaskStatus,
      );

      const requester = await Captcha.getCaptcha(this.context, this._handleHarvest, this._platform);
      this.context.setCaptchaRequest(requester);
    }

    // Check the status of the request
    switch (this.context.captchaRequest.status) {
      case 'pending': {
        // waiting for token, sleep for 1s and then return same state to check again
        if (!this._form) {
          this.generateForm(FormTypes.Checkout);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        return States.CAPTCHA;
      }
      case 'fulfilled': {
        // token was returned, store it and remove the request
        const { value } = this.context.captchaRequest;
        this.context.setCaptchaToken(value);
        this.context.setCaptchaRequest(null);
        // We have the token, so suspend harvesting for now
        Captcha.suspendHarvestCaptcha(this.context, this._platform);

        emitEvent(
          this.context,
          [this.context.id],
          {
            message: 'Submitting checkout',
          },
          Events.TaskStatus,
        );

        return States.SUBMIT_CHECKOUT;
      }
      case 'cancelled':
      case 'destroyed': {
        logger.silly('Harvest Captcha status: %s, stopping...', this.context.captchaRequest.status);
        return States.ERROR;
      }
      default: {
        logger.silly(
          'Unknown Harvest Captcha status! %s, stopping...',
          this.context.captchaRequest.status,
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
      task: {
        profile: { matches, shipping, billing, payment },
        checkoutDelay,
        monitor,
      },
    } = this.context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (!this._form) {
      const generated = await this.generateForm(FormTypes.Checkout);

      if (!generated) {
        const profileInfo = matches ? shipping : billing;
        const { id: size } = this._product.variant;
        this._form = backupForm(this._region, profileInfo, payment, size);
      }

      // patch in the captcha token
      if (this.context.captchaToken) {
        this._form += `&g-recaptcha-response=${this.context.captchaToken}`;
      }
    }

    if (!this._pooky && this.context.pookyEnabled) {
      this._pooky = await this.generatePooky(this._region);
    }

    // stop the padding timer...
    this.context.timers.checkout.stop(new Date().getTime());
    const totalTimeout =
      checkoutDelay - this.context.timers.checkout.getRunTime(new Date().getTime());
    this.context.timers.checkout.reset(); // reset the timer just in case...

    if (totalTimeout && totalTimeout > 0) {
      emitEvent(
        this.context,
        [this.context.id],
        {
          message: `Submitting checkout in ${totalTimeout}ms`,
        },
        Events.TaskStatus,
      );

      this._delayer = waitForDelay(totalTimeout, this._aborter.signal);
      await this._delayer;
    }

    emitEvent(
      this.context,
      [this.context.id],
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

      this._form = '';

      if (!res.ok) {
        const error = new Error('Failed submitting checkout');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();
      if (body && body.status && /queued/i.test(body.status)) {
        const { slug } = body;
        if (!slug) {
          emitEvent(
            this.context,
            [this.context.id],
            {
              message: 'Invalid checkout slug',
            },
            Events.TaskStatus,
          );
          return States.SUBMIT_CHECKOUT;
        }

        this._slug = slug;
        return States.CHECK_ORDER;
      }

      if (body && body.status && /out/i.test(body.status)) {
        emitEvent(
          this.context,
          [this.context.id],
          {
            message: `Out of stock! Delaying ${monitor}ms`,
          },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;

        this._pooky = null;
      }

      if (body && body.status && /dup/i.test(body.status)) {
        emitEvent(
          this.context,
          [this.context.id],
          {
            message: 'Duplicate order',
          },
          Events.TaskStatus,
        );

        return States.DONE;
      }

      if (body && body.status && /failed/i.test(body.status)) {
        emitEvent(
          this.context,
          [this.context.id],
          {
            message: 'Checkout failed',
          },
          Events.TaskStatus,
        );

        this._pooky = null;
      }

      return States.SUBMIT_CHECKOUT;
    } catch (error) {
      this._pooky = null;
      this._form = '';
      return this._handleError(error, States.SUBMIT_CHECKOUT);
    }
  }

  async _handleCheckOrder() {
    const {
      aborted,
      logger,
      proxy,
      task: { monitor },
    } = this.context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    emitEvent(
      this.context,
      [this.context.id],
      {
        message: `Checking order`,
      },
      Events.TaskStatus,
    );

    try {
      const res = await this._fetch(`/checkout/${this._slug}/status.json`, {
        method: 'GET',
        agent: proxy ? proxy.proxy : null,
        headers: getHeaders(),
      });

      this._form = '';

      if (!res.ok) {
        const error = new Error('Failed checking order');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();

      if (body && body.status && /failed|out/i.test(body.status)) {
        const message = /out/.test(body.status)
          ? `Out of stock! Delaying ${monitor}ms`
          : 'Checkout failed';

        emitEvent(
          this.context,
          [this.context.id],
          {
            message,
          },
          Events.TaskStatus,
        );

        const {
          image,
          currency,
          variant: { name: size },
        } = this._product;

        const {
          task: {
            product: { name: productName, price },
            store: { name: storeName, url: storeUrl },
            profile: { name },
          },
          webhookManager,
        } = this.context;

        if (!this._sentWebhook) {
          this._sentWebhook = true;
          webhookManager.insert({
            success: false,
            product: productName,
            price: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
              price.toString().slice(0, -2),
            ),
            store: { name: storeName, url: storeUrl },
            profile: name,
            size,
            image: `${image}`.startsWith('http') ? image : `https:${image}`,
          });
          webhookManager.send();
        }

        this._pooky = null;
        this.context.setCaptchaToken(null);

        if (this._region !== Regions.US) {
          return States.CAPTCHA;
        }

        this._delayer = waitForDelay(this.context.task.monitor, this._aborter.signal);
        await this._delayer;

        return States.SUBMIT_CHECKOUT;
      }

      if (body && body.status && /paid/i.test(body.status)) {
        emitEvent(
          this.context,
          [this.context.id],
          {
            message: 'Check email!',
          },
          Events.TaskStatus,
        );

        const {
          image,
          currency,
          variant: { name: size },
        } = this._product;

        const {
          task: {
            product: { name: productName, price },
            store: { name: storeName, url: storeUrl },
            profile: { name },
          },
          webhookManager,
        } = this.context;

        webhookManager.insert({
          success: true,
          product: productName,
          price: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
            price.toString().slice(0, -2),
          ),
          store: { name: storeName, url: storeUrl },
          profile: name,
          size,
          image: `${image}`.startsWith('http') ? image : `https:${image}`,
        });
        webhookManager.send();

        return States.DONE;
      }

      this._delayer = waitForDelay(500, this._aborter.signal);
      await this._delayer;

      emitEvent(
        this.context,
        [this.context.id],
        {
          message: `Checking order`,
        },
        Events.TaskStatus,
      );

      return States.CHECK_ORDER;
    } catch (error) {
      return this._handleError(error, States.CHECK_ORDER);
    }
  }

  async _handleStepLogic(currentState) {
    const { logger } = this.context;

    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.WAIT_FOR_PRODUCT]: this._handleWaitForProduct,
      [States.ADD_TO_CART]: this._handleAddToCart,
      [States.CAPTCHA]: this._handleCaptcha,
      [States.SUBMIT_CHECKOUT]: this._handleSubmitCheckout,
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

TaskPrimitive.Events = Events;
TaskPrimitive.States = States;
