/* eslint-disable no-await-in-loop */
import cheerio from 'cheerio';

import { Bases, Utils, Constants, Classes } from '../../../common';
import { Task as TaskConstants } from '../../constants';
import { Forms, stateForError, getHeaders, pickVariant } from '../../utils';

const { addToCart, parseForm, contactForm, shippingForm, paymentForm, completeForm } = Forms;
const { Task, Platforms, Monitor } = Constants;
const { currencyWithSymbol, userAgent, waitForDelay, emitEvent } = Utils;
const { BaseTask } = Bases;

const { Events } = Task;
const { States, StateMap } = TaskConstants;
const { ParseType } = Monitor;
const { Captcha } = Classes;

export default class TaskPrimitive extends BaseTask {
  constructor(context, initState, platform = Platforms.Shopify) {
    super(context, initState, platform);

    if (this.context.task.account) {
      this._state = States.LOGIN;
    }

    const preFetchedShippingRates = this.context.task.profile.rates.find(
      r => r.store.url === this.context.task.store.url,
    );

    this._selectedShippingRate = {
      name: null,
      price: null,
      id: null,
    };

    if (preFetchedShippingRates && preFetchedShippingRates.selectedRate) {
      const { name, price, rate } = preFetchedShippingRates.selectedRate;
      this._selectedShippingRate = {
        name,
        price,
        id: rate,
      };
    }

    this._addedToCart = false;
    this._checker = 0;
    this._fromWaitForProduct = false;
    this._solvedCheckpoint = false;

    this.protection = false;
    this.generating = false;
    this._ctdCookie = '';
    // checkout specific globals
    this._tokens = [];
    this._token = null;
    this._hash = null;
    this._gateway = '';
    this._key = null;
    this._store = null;
    this._form = '';
    this._product = null;
  }

  async getCheckpointCookies(jar) {
    const store = jar.Store || jar.store;

    if (!store) {
      return [];
    }

    const found = [];
    store.getAllCookies((_, cookies) => {
      for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i];
        if (/_shopify_checkpoint|_shopify_y/i.test(cookie.key)) {
          this.context.logger.debug(`Found cookie %s=%s;`, cookie.key, cookie.value);
          found.push(cookie);
        }
      }
    });
    return found;
  }

  async getCtdCookie(jar) {
    const store = jar.Store || jar.store;

    if (!store) {
      return [];
    }

    let value = null;
    store.getAllCookies((_, cookies) => {
      for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i];
        if (/_ctd/i.test(cookie.key)) {
          this.context.logger.debug(`Found cookie %s=%s;`, cookie.key, cookie.value);
          ({ value } = cookie);
        }
      }
    });
    return value;
  }

  async generateSessions() {
    const {
      task: {
        profile: { payment, billing },
        store: { url },
      },
    } = this.context;

    if (this.context.aborted) {
      return States.DONE;
    }

    if (this._tokens.length >= 1) {
      this._delayer = waitForDelay(150, this._aborter.signal);
      await this._delayer;

      return this.generateSessions();
    }

    const { data } = await this._handler(
      'https://elb.deposit.shopifycs.com/sessions',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Origin: 'https://checkout.shopifycs.com',
          Referer: `https://checkout.shopifycs.com/number?identifier=${
            this._hash
          }&location=${encodeURIComponent(
            `${url}/${this._store}/checkouts/${this._hash}?previous_step=shipping_method&step=payment_method`,
          )}`,
        },
        body: JSON.stringify({
          credit_card: {
            number: payment.card,
            name: `${billing.firstName} ${billing.lastName}`,
            month: parseInt(payment.exp.slice(0, 2), 10),
            year: `20${parseInt(payment.exp.slice(3, 5), 10)}`,
            verification_value: payment.cvv,
          },
        }),
      },
      null,
      States.PAYMENT_SESSION,
    );

    if (!data) {
      return this.generateSessions();
    }

    const { id } = await data.json();

    if (id) {
      this._tokens.push(id);
    }

    return this.generateSessions();
  }

  async _handler(endpoint, options, message, from, redirects = []) {
    const {
      logger,
      aborted,
      proxy,
      task: {
        id,
        store: { url, apiKey },
        monitor,
      },
    } = this.context;

    if (aborted) {
      logger.silly(`Aborted! Stopping task ${id}`);
      return States.ABORT;
    }

    if (message) {
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
    }

    // we need to do this before every request..
    // if (this.context.shared.cookies && this.context.shared.cookies.length) {
    //   this.context.shared.cookies.map(cookie =>
    //     this.context.jar.setCookieSync(cookie, this.context.task.store.url),
    //   );
    // }

    const baseOptions = {
      compress: true,
      agent: proxy ? proxy.proxy : null,
      redirect: 'manual',
      follow: 0,
      headers: getHeaders({ url, apiKey }),
    };

    try {
      const res = await this._fetch(endpoint, {
        ...baseOptions,
        ...options,
        headers: {
          ...baseOptions.headers,
          ...options.headers,
        },
      });

      const { status, headers } = res;

      logger.debug(`${from} STATUS: ${status}`);
      const error = stateForError(
        { status },
        {
          message,
          nextState: from,
        },
      );

      if (error) {
        if (error.message) {
          emitEvent(this.context, [this.context.id], { message: error.message }, Events.TaskStatus);
        }
        return { nextState: error.nextState };
      }

      const redirectUrl = headers.get('location');
      logger.debug(`${from} REDIRECT: ${redirectUrl}`);
      if (!redirectUrl) {
        return { data: res };
      }

      // only handle redirects if we have an output map of where we are headed..
      if (redirects.length) {
        // eslint-disable-next-line no-restricted-syntax
        for (const { url: path, message: newMsg, state } of redirects) {
          if (new RegExp(path, 'i').test(redirectUrl)) {
            if (/checkouts/i.test(redirectUrl) && !/checkpoint/i.test(redirectUrl)) {
              const [noQs] = redirectUrl.split('?');
              [, , , this._store, , this._hash] = noQs.split('/');
            }

            if (/password/i.test(redirectUrl)) {
              emitEvent(
                this.context,
                [this.context.id],
                { message: 'Password page' },
                Events.TaskStatus,
              );

              this._delayer = waitForDelay(monitor, this._aborter.signal);
              await this._delayer;
            }

            if (
              /stock_problems/i.test(redirectUrl) &&
              (from === States.COMPLETE_CHECKOUT || from === States.GO_TO_PAYMENT)
            ) {
              emitEvent(
                this.context,
                [this.context.id],
                { message: `Out of stock! Delaying ${monitor}ms` },
                Events.TaskStatus,
              );

              this._delayer = waitForDelay(monitor, this._aborter.signal);
              await this._delayer;
            }

            if (/throttle/i.test(redirectUrl)) {
              let queueUrl = redirectUrl;
              if (!/_ctd/i.test(redirectUrl)) {
                this._ctdCookie = await this.getCtdCookie(this.context.jar);
                queueUrl = `${this.context.task.store.url}/throttle/queue?_ctd=${this._ctdCookie}`;
              }

              try {
                await this._fetch(queueUrl, {
                  method: 'GET',
                  compress: true,
                  agent: proxy ? proxy.proxy : null,
                  redirect: 'manual',
                  follow: 0,
                  headers: {
                    'Upgrade-Insecure-Requests': 1,
                    'User-Agent': userAgent,
                    Connection: 'Keep-Alive',
                  },
                });
              } catch (e) {
                // fail silently...
              }
            }

            if (/processing/i.test(redirectUrl)) {
              this._token = null;
              this.context.setCaptchaToken(null);
            }

            if (newMsg) {
              if (from === States.SUBMIT_CHECKPOINT && this._fromWaitForProduct) {
                return { nextState: state, data: res };
              }
              emitEvent(this.context, [this.context.id], { message: newMsg }, Events.TaskStatus);
            }
            return { nextState: state, data: res };
          }
        }
      }

      return { data: res };
    } catch (error) {
      logger.error(`${from} ERROR: %s –– %j`, error.status || error.errno, error.message);

      const nextState = stateForError(error, {
        message,
        nextState: from,
      });

      if (nextState) {
        const { message: erroredMessage, nextState: erroredState } = nextState;

        if (erroredMessage && !/null|undefined/i.test(erroredMessage)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: erroredMessage },
            Events.TaskStatus,
          );

          if (/connection/i.test(erroredMessage)) {
            this._delayer = waitForDelay(monitor, this._aborter.signal);
            await this._delayer;
          }
        }
        return { nextState: erroredState };
      }

      const newMessage =
        error.status || error.errno ? `${message} (${error.status || error.errno})` : message;

      emitEvent(this.context, [this.context.id], { message: newMessage }, Events.TaskStatus);
      return { nextState: from };
    }
  }

  async _handleLogin() {
    const { username, password } = this.context.task.account;

    const { nextState } = await this._handler(
      '/account/login',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: `form_type=customer_login&utf8=%E2%9C%93&customer%5Bemail%5D=${encodeURIComponent(
          username,
        )}&customer%5Bpassword%5D=${encodeURIComponent(password)}&return_url=%2Faccount`,
      },
      'Logging in',
      States.LOGIN,
      [
        {
          url: 'checkpoint',
          message: 'Going to checkpoint',
          state: States.GO_TO_CHECKPOINT,
        },
        {
          url: 'password',
          message: 'Logging in',
          state: States.LOGIN,
        },
        {
          url: 'challenge',
          message: 'Captcha needed',
          state: States.ERROR,
        },
        {
          url: 'login',
          message: 'Invalid credentials',
          state: States.ERROR,
        },
        {
          url: 'account',
          state: States.DONE,
        },
      ],
    );

    if (nextState) {
      return nextState;
    }

    return States.LOGIN;
  }

  async _handleGatherData() {
    const { nextState, data = {} } = await this._handler(
      '/payments/config',
      {},
      'Gathering data',
      States.GATHER_DATA,
    );

    if (nextState) {
      return nextState;
    }

    const { status } = data;

    if (!status || status !== 200) {
      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Invalid Shopify store' },
        Events.TaskStatus,
      );

      return States.ERROR;
    }

    const { paymentInstruments } = await data.json();

    const { accessToken, checkoutConfig: { shopId } = {} } = paymentInstruments;

    if (!accessToken) {
      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Invalid Shopify store' },
        Events.TaskStatus,
      );

      return States.ERROR;
    }

    if (shopId) {
      this._store = shopId;
    }

    this.context.task.store.apiKey = accessToken;

    // NOTE: subclass determines next state...
    return States.DONE;
  }

  async _handleGetCheckpoint() {
    const { url } = this.context.task.store;

    const { nextState, data } = await this._handler(
      '/checkpoint',
      {
        headers: {
          referer: `${url}/cart`,
        },
      },
      'Going to checkpoint',
      States.GO_TO_CHECKPOINT,
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
      ],
    );

    const { status } = data;

    if (status !== 200) {
      if (this._fromWaitForProduct) {
        // reset this toggle so we don't proceed to captcha after ATC if we don't need to...
        this._fromWaitForProduct = false;
        return States.WAIT_FOR_PRODUCT;
      }
      return States.CREATE_CHECKOUT;
    }

    if (nextState) {
      return nextState;
    }

    const body = await data.text();
    const $ = cheerio.load(body, { normalizeWhitespace: true, xmlMode: false });

    $('form[action="/checkpoint"] input, textarea, select, button').each((_, el) => {
      const name = $(el).attr('name');
      let value = $(el).attr('value') || '';

      if (/authenticity_token/i.test(name)) {
        value = encodeURIComponent(value);
      }

      if (/g-recaptcha-response/i.test(name)) {
        return;
      }

      if (name) {
        this._form += `${name}=${value ? value.replace(/\s/g, '+') : ''}&`;
      }
    });

    // recaptcha sitekey regex...
    const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
    if (match && match.length) {
      [, this.context.task.store.sitekey] = match;
    }

    if (this._form.endsWith('&')) {
      this._form = this._form.slice(0, -1);
    }

    const requester = await Captcha.getCaptcha(
      this.context,
      this._handleHarvest,
      this._platform,
      true,
    );
    this.context.setCaptchaRequest(requester);

    return States.CAPTCHA;
  }

  async _handleSubmitCheckpoint() {
    const { captchaToken } = this.context;

    if (captchaToken && !/g-recaptcha-response/i.test(this._form)) {
      const parts = this._form.split('&');
      if (parts && parts.length) {
        this._form = '';
        // eslint-disable-next-line array-callback-return
        parts.forEach(part => {
          if (/authenticity_token/i.test(part)) {
            this._form += `${part}&g-recaptcha-response=${captchaToken}&`;
          } else {
            this._form += `${part}&`;
          }
        });
      }
    }

    if (this._form.endsWith('&')) {
      this._form = this._form.slice(0, -1);
    }

    const { nextState } = await this._handler(
      '/checkpoint',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: this._form,
      },
      'Submitting checkpoint',
      States.SUBMIT_CHECKPOINT,
      [
        {
          url: 'checkout',
          message: 'Creating checkout',
          state: States.CREATE_CHECKOUT,
        },
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
          url: 'cart',
          message: 'Creating checkout',
          state: /palace/i.test(this.context.task.store.url)
            ? States.GO_TO_CART
            : States.CREATE_CHECKOUT,
        },
        {
          url: 'checkouts',
          message: 'Going to checkout',
          state: States.GO_TO_CHECKOUT,
        },
      ],
    );

    this.context.setCaptchaToken(null);
    this._form = '';

    if (
      this._fromWaitForProduct &&
      !this._addedToCart &&
      (nextState === States.GO_TO_CART || nextState === States.CREATE_CHECKOUT)
    ) {
      this._solvedCheckpoint = true;
      return States.WAIT_FOR_PRODUCT;
    }

    // const cookies = await this.getCheckpointCookies(this.context.jar);

    // if (cookies.length) {
    //   this.context.setShared(cookies);
    // }

    if (nextState) {
      return nextState;
    }

    return States.GO_TO_CHECKPOINT;
  }

  async _handleQueue() {
    const { type } = this.context.task;

    let message;
    let toState;
    const { nextState, data } = await this._handler(
      '/checkout/poll?js_poll=1',
      {},
      'Polling queue',
      States.QUEUE,
    );

    if (nextState) {
      return nextState;
    }

    const { status, headers } = data;

    if (status !== 200) {
      const retryAfter = headers.get('retry-after') * 1000 || 2500;

      this._delayer = waitForDelay(retryAfter, this._aborter.signal);
      await this._delayer;

      return States.QUEUE;
    }

    const { data: response } = await this._handler(
      `${this.context.task.store.url}/throttle/queue?_ctd=${this._ctdCookie}&_ctd_update=`,
      {},
    );

    const respBody = await response.text();
    const match = respBody.match(/href="(.*)"/);

    if (match && match.length) {
      const [, checkoutUrl] = match;

      if (checkoutUrl && /checkouts/i.test(checkoutUrl)) {
        const [checkoutNoQs] = checkoutUrl.split('?');
        [, , , this._store, , this._hash] = checkoutNoQs.split('/');
        ({ message, nextState: toState } = StateMap[this._prevState](
          type,
          this.context.task,
          this._selectedShippingRate,
        ));

        emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        return toState;
      }
    }

    const retryAfter = headers.get('Retry-After') * 1000 || 2500;

    this._delayer = waitForDelay(retryAfter, this._aborter.signal);
    await this._delayer;

    return States.QUEUE;
  }

  async _handleWaitForProduct() {
    const {
      aborted,
      logger,
      parseType,
      task: {
        randomInStock,
        product: { variants },
        size,
      },
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this.context.task.product.variants) {
      let variant;
      if (parseType !== ParseType.Variant) {
        variant = await pickVariant(variants, size, logger, randomInStock);
      } else {
        [variant] = variants;
      }

      if (!variant) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'No size matched' },
          Events.TaskStatus,
        );
        return States.ABORT;
      }

      emitEvent(
        this.context,
        [this.context.id],
        {
          productImage: `${this.context.task.product.image}`.startsWith('http')
            ? this.context.task.product.image
            : `https:${this.context.task.product.image}`,
          productImageHi: `${this.context.task.product.image}`.startsWith('http')
            ? this.context.task.product.image
            : `https:${this.context.task.product.image}`,
          productName: this.context.task.product.name,
          chosenSize: variant.option,
        },
        Events.TaskStatus,
      );

      this._product = variant;

      return States.ADD_TO_CART;
    }

    if (!this._solvedCheckpoint && this._checker % 10 === 0) {
      this._checker = 0;
      this._fromWaitForProduct = true;
      return States.GO_TO_CHECKPOINT;
    }

    this._checker += 1;
    this._delayer = waitForDelay(150, this._aborter.signal);
    await this._delayer;

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

    const { id } = this._product;

    let contentType = 'application/json';
    if (/dsm uk|dsm us|funko/i.test(name)) {
      contentType = 'application/x-www-form-urlencoded';
    }

    const { nextState, data } = await this._handler(
      '/cart/add.js',
      {
        method: 'POST',
        headers: {
          'content-type': contentType,
        },
        body: addToCart(id, name, hash),
      },
      'Adding to cart',
      States.ADD_TO_CART,
      [
        {
          url: 'checkpoint',
          message: 'Going to checkpoint',
          state: States.GO_TO_CHECKPOINT,
        },
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

    const body = await data.text();

    if (/cannot find variant/i.test(body)) {
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

    this._addedToCart = true;

    return States.DONE;
  }

  async _handleGetCart() {
    const {
      task: {
        store: { apiKey },
      },
    } = this.context;

    const { nextState, data } = await this._handler(
      '/cart',
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
      },
      'Going to cart',
      States.GO_TO_CART,
      [
        {
          url: 'checkpoint',
          message: 'Going to checkpoint',
          state: States.GO_TO_CHECKPOINT,
        },
        {
          url: 'password',
          message: 'Going to cart',
          state: States.GO_TO_CART,
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

    const body = await data.text();
    const $ = cheerio.load(body, {
      normalizeWhitespace: true,
      xmlMode: false,
    });

    $('form[action="/cart"], input, select, textarea, button').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value') || '';

      // Blacklisted values/names
      if (
        name &&
        !/undefined|null|q|g|gender|\$fields|email|subscribe|updates\[.*:.*]/i.test(name) &&
        !/update cart|Update|{{itemQty}}/i.test(value)
      ) {
        this._form += `${name}=${value || ''}&`;
      }
    });

    // replace all spaces with `+`
    this._form.replace(/\s/g, '+');

    // and strip the last character if it's an ampersand
    if (this._form.endsWith('&')) {
      this._form = this._form.slice(0, -1);
    }

    return States.CREATE_CHECKOUT;
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

    emitEvent(
      this.context,
      [this.context.id],
      {
        message: 'Waiting for captcha',
      },
      Events.TaskStatus,
    );

    // start request if it hasn't started already
    if (!this.context.captchaRequest) {
      const requester = await Captcha.getCaptcha(
        this.context,
        this._handleHarvest,
        this._platform,
        this._prevState === States.GO_TO_CHECKPOINT || false,
      );
      this.context.setCaptchaRequest(requester);
    }

    // Check the status of the request
    switch (this.context.captchaRequest.status) {
      case 'pending': {
        // waiting for token, sleep for delay and then return same state to check again
        await new Promise(resolve => setTimeout(resolve, 150));

        // we harvested checkpoint on another task, let's use those..
        // NOTE: we don't have to worry about site checking, since sharing is already based on site
        // if (
        //   this._prevState === States.GO_TO_CHECKPOINT &&
        //   this.context.shared.cookies &&
        //   this.context.shared.cookies.length
        // ) {
        //   this.context.setCaptchaRequest(null);
        //   Captcha.suspendHarvestCaptcha(this.context, this._platform);

        //   return States.CREATE_CHECKOUT;
        // }

        if (this._fromWaitForProduct && this.context.task.product.variants && !this._addedToCart) {
          return States.WAIT_FOR_PRODUCT;
        }

        return States.CAPTCHA;
      }
      case 'fulfilled': {
        // token was returned, store it and remove the request
        const { value } = this.context.captchaRequest;
        this.context.setCaptchaToken(value);
        this.context.setCaptchaRequest(null);
        // We have the token, so suspend harvesting for now
        Captcha.suspendHarvestCaptcha(this.context, this._platform);

        if (this._prevState === States.GO_TO_SHIPPING) {
          return States.SUBMIT_SHIPPING;
        }

        if (
          this._prevState === States.GO_TO_CHECKPOINT ||
          (this._fromWaitForProduct && this._prevState === States.ADD_TO_CART)
        ) {
          return States.SUBMIT_CHECKPOINT;
        }

        if (
          this._prevState === States.GO_TO_CHECKOUT ||
          this._prevState === States.SUBMIT_SHIPPING
        ) {
          return States.SUBMIT_CUSTOMER;
        }

        if (this._prevState === States.SUBMIT_CHECKOUT) {
          return States.COMPLETE_CHECKOUT;
        }

        // return to the previous state
        return this._prevState;
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

  async _handleGetCheckout() {
    const {
      task: {
        store: { apiKey },
        captcha,
      },
      captchaToken,
    } = this.context;

    const { nextState, data } = await this._handler(
      `/${this._store}/checkouts/${this._hash}`,
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': apiKey,
        },
      },
      'Going to checkout',
      States.GO_TO_CHECKOUT,
      [
        {
          url: 'login',
          message: 'Account needed',
          state: States.ERROR,
        },
        {
          url: 'checkpoint',
          message: 'Going to checkpoint',
          state: States.GO_TO_CHECKPOINT,
        },
        {
          url: 'password',
          message: 'Going to checkout',
          state: States.GO_TO_CHECKOUT,
        },
        {
          url: 'throttle',
          message: 'Polling queue',
          state: States.QUEUE,
        },
        {
          url: 'cart',
          message: 'Submitting information',
          state: States.SUBMIT_CUSTOMER,
        },
      ],
    );

    if (nextState) {
      return nextState;
    }

    const body = await data.text();
    const $ = cheerio.load(body, {
      xmlMode: false,
      normalizeWhitespace: true,
    });

    if (/Getting available shipping rates/i.test(body)) {
      return States.GO_TO_SHIPPING;
    }

    if (new RegExp(`${this._hash}/stock_problems`, 'i').test(body)) {
      return States.SUBMIT_CUSTOMER;
    }

    // form parser...
    this._form = await parseForm(
      $,
      States.GO_TO_CHECKOUT,
      this._hash,
      this.context.task.profile,
      'form.edit_checkout',
      'input, select, textarea, button',
    );

    if (this._form.includes('fs_count')) {
      this.protection = true;
    }

    // recaptcha sitekey parser...
    const sitekey = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
    if (sitekey && sitekey.length) {
      [, this.context.task.store.sitekey] = sitekey;
    }

    if ((/recaptcha/i.test(body) || captcha) && !captchaToken) {
      return States.CAPTCHA;
    }

    const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

    if (match && match.length) {
      const [, step] = match;

      if (/processing/i.test(step)) {
        return States.CHECK_ORDER;
      }

      if (/review/i.test(step)) {
        return States.COMPLETE_CHECKOUT;
      }

      if (/contact/i.test(step)) {
        return States.SUBMIT_CUSTOMER;
      }

      if (/shipping/i.test(step)) {
        return States.SUBMIT_SHIPPING;
      }

      if (/payment/i.test(step)) {
        return States.SUBMIT_CHECKOUT;
      }
    }

    return States.SUBMIT_CUSTOMER;
  }

  async _handleSubmitCustomer() {
    const {
      task: {
        store: { apiKey },
      },
      captchaToken,
    } = this.context;

    if (!this._form) {
      this._form = contactForm(this.context.task.profile, captchaToken);
    }

    if (captchaToken && !/g-recaptcha-response/i.test(this._form)) {
      const parts = this._form.split('button=');
      if (parts && parts.length) {
        this._form = '';
        parts.forEach((part, i) => {
          if (i === 0) {
            this._form += `${part}g-recaptcha-response=${captchaToken}`;
          } else {
            this._form += part;
          }
        });
      }
    }

    const { nextState, data } = await this._handler(
      `/${this._store}/checkouts/${this._hash}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: this._form,
      },
      'Submitting information',
      States.SUBMIT_CUSTOMER,
      [
        {
          url: 'password',
          message: 'Submitting information',
          state: States.SUBMIT_CUSTOMER,
        },
        {
          url: 'throttle',
          message: 'Polling queue',
          state: States.QUEUE,
        },
        {
          url: 'step=shipping_method',
          message: 'Fetching rates',
          state: States.GO_TO_SHIPPING,
        },
        {
          url: 'step=payment_method',
          message: 'Submitting checkout',
          state: States.GO_TO_PAYMENT,
        },
      ],
    );

    this._form = '';

    if (nextState) {
      if (
        nextState === States.GO_TO_SHIPPING &&
        !this.protection &&
        this._selectedShippingRate.id
      ) {
        return States.SUBMIT_SHIPPING;
      }
      return nextState;
    }

    const body = await data.text();
    if (/Captcha validation fail/i.test(body)) {
      this.context.setCaptchaToken(null);
      return States.GO_TO_CHECKOUT;
    }

    // NOTE: kick off the payment session generator
    if (!this.generating) {
      this.generateSessions();
    }
    // NOTE: determined by subclasses..
    return States.DONE;
  }

  async _handleAlternativeRates() {
    const { zip, country, province } = this.context.task.profile.shipping;

    const provinceValue = province ? province.value : '';

    const endpoint = `/cart/shipping_rates.json?shipping_address[zip]=${zip}&shipping_address[country]=${country.value}&shipping_address[province]=${provinceValue}`;

    const { data } = await this._handler(endpoint, {});

    const { status } = data;

    const body = await data.json();

    if (status === 422) {
      return States.ERROR;
    }

    if (body && (!body.shipping_rates || !body.shipping_rates.length)) {
      return States.GO_TO_SHIPPING;
    }

    const { shipping_rates: shippingRates } = body;
    shippingRates.forEach(rate => {
      const { name, price, source, code } = rate;
      const newRate = {
        name,
        price,
        id: encodeURIComponent(`${source}-${code}-${price}`),
      };

      if (
        !this._selectedShippingRate.price ||
        parseFloat(price) < parseFloat(this._selectedShippingRate.price)
      ) {
        this._selectedShippingRate = newRate;
      }
    });

    return States.DONE;
  }

  async _handleGetShipping() {
    const {
      task: { captcha },
      captchaToken,
    } = this.context;

    const { nextState, data } = await this._handler(
      `/${this._store}/checkouts/${this._hash}`,
      {},
      'Fetching rates',
      States.GO_TO_SHIPPING,
      [
        {
          url: 'checkpoint',
          message: 'Going to checkpoint',
          state: States.GO_TO_CHECKPOINT,
        },
        {
          url: 'password',
          message: 'Fetching rates',
          state: States.GO_TO_SHIPPING,
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

    const body = await data.text();
    const $ = cheerio.load(body, {
      xmlMode: false,
      normalizeWhitespace: true,
    });

    if (/no shipping methods available/i.test(body)) {
      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Unsupported country' },
        Events.TaskStatus,
      );

      return States.ERROR;
    }

    if (new RegExp(`${this._hash}/stock_problems`, 'i').test(body)) {
      if (!this._selectedShippingRate.id) {
        const sideState = await this._handleAlternativeRates();

        if (sideState === States.DONE) {
          // build the shipping form, and proceed to submit shipping
          this._form = shippingForm(this._selectedShippingRate.id);
          return States.SUBMIT_SHIPPING;
        }

        return States.GO_TO_SHIPPING;
      }

      return States.SUBMIT_SHIPPING;
    }

    if (/Getting available shipping rates/i.test(body)) {
      this._delayer = waitForDelay(150, this._aborter.signal);
      await this._delayer;

      return States.GO_TO_SHIPPING;
    }

    // form parser...
    this._form = await parseForm(
      $,
      States.GO_TO_SHIPPING,
      this._hash,
      this.context.task.profile,
      'form.edit_checkout',
      'input, select, textarea, button',
    );

    // recaptcha sitekey parser...
    const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
    if (match && match.length) {
      [, this.context.task.store.sitekey] = match;
    }

    if ((/recaptcha/i.test(body) || captcha) && !captchaToken) {
      return States.CAPTCHA;
    }

    return States.SUBMIT_SHIPPING;
  }

  async _handleSubmitShipping() {
    const {
      task: { captcha },
      captchaToken,
    } = this.context;

    if (!this._form) {
      this._form = shippingForm(this._selectedShippingRate.id);
    }

    const { nextState, data } = await this._handler(
      `/${this._store}/checkouts/${this._hash}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: this._form,
      },
      'Submitting shipping',
      States.SUBMIT_SHIPPING,
      [
        {
          url: 'processing',
          message: 'Checking order',
          state: States.CHECK_ORDER,
        },
        {
          url: 'throttle',
          message: 'Polling queue',
          state: States.QUEUE,
        },
        {
          url: 'password',
          message: 'Submitting shipping',
          state: States.SUBMIT_SHIPPING,
        },
        {
          url: 'step=payment_method',
          message: 'Submitting checkout',
          state: States.GO_TO_PAYMENT,
        },
        {
          url: 'step=shipping_method',
          message: 'Fetching rates',
          state: States.GO_TO_SHIPPING,
        },
        {
          url: 'step=contact_information',
          message: 'Going to checkout',
          state: States.GO_TO_CHECKOUT,
        },
      ],
    );

    this._form = '';

    if (nextState) {
      return nextState;
    }

    const body = await data.text();

    if (/Getting available shipping rates/i.test(body)) {
      this._delayer = waitForDelay(500, this._aborter.signal);
      await this._delayer;

      return States.SUBMIT_SHIPPING;
    }

    // recaptcha sitekey parser...
    const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
    if (match && match.length) {
      [, this.context.task.store.sitekey] = match;
    }

    if ((/recaptcha/i.test(body) || captcha) && !captchaToken) {
      return States.CAPTCHA;
    }

    if (new RegExp(`${this._hash}/stock_problems`, 'i').test(body)) {
      return States.GO_TO_PAYMENT;
    }

    return States.SUBMIT_SHIPPING;
  }

  async _handleGetPayment() {
    const { nextState, data } = await this._handler(
      `/${this._store}/checkouts/${this._hash}`,
      {},
      'Submitting checkout',
      States.GO_TO_PAYMENT,
      [
        {
          url: 'checkpoint',
          message: 'Going to checkpoint',
          state: States.GO_TO_CHECKPOINT,
        },
        {
          url: 'password',
          message: 'Submitting checkout',
          state: States.GO_TO_PAYMENT,
        },
        {
          url: 'throttle',
          message: 'Polling queue',
          state: States.QUEUE,
        },
        {
          url: 'stock_problems',
          message: `Submitting checkout`,
          state: States.GO_TO_PAYMENT,
        },
      ],
    );

    this._form = '';

    if (nextState) {
      return nextState;
    }

    const body = await data.text();
    const $ = cheerio.load(body, {
      xmlMode: false,
      normalizeWhitespace: true,
    });

    if (/payments aren't available right now/i.test(body)) {
      this._delayer = waitForDelay(250, this._aborter.signal);
      await this._delayer;

      return States.GO_TO_PAYMENT;
    }

    if (/calculating taxes/i.test(body)) {
      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Calculating taxes' },
        Events.TaskStatus,
      );

      this._delayer = waitForDelay(250, this._aborter.signal);
      await this._delayer;

      return States.GO_TO_PAYMENT;
    }

    if (new RegExp(`${this._hash}/processing`, 'i').test(body)) {
      return States.CHECK_ORDER;
    }

    if (new RegExp(`${this._hash}/stock_problems`, 'i').test(body)) {
      return States.GO_TO_PAYMENT;
    }

    // form parser...
    this._form = await parseForm(
      $,
      States.GO_TO_PAYMENT,
      this._hash,
      this.context.task.profile,
      'form.edit_checkout',
      'input, select, textarea, button',
    );

    return States.SUBMIT_CHECKOUT;
  }

  async _handleSubmitCheckout() {
    if (this.context.aborted) {
      return States.ABORT;
    }

    if (!this._token) {
      if (!this._tokens.length) {
        this._delayer = waitForDelay(250, this._aborter.signal);
        await this._delayer;

        return States.SUBMIT_CHECKOUT;
      }
      this._token = this._tokens.shift();
    }

    if (!this._form) {
      this._form = paymentForm(this.context.task.profile, this._gateway, this._token);
    }

    if (this._form.indexOf(this._token) === -1) {
      const parts = this._form.split('s=');
      if (parts && parts.length) {
        this._form = '';
        parts.forEach((part, i) => {
          if (i === 0) {
            this._form += `${part}s=${this._token}`;
          } else {
            this._form += part;
          }
        });
      }
    }

    const { nextState, data } = await this._handler(
      `/${this._store}/checkouts/${this._hash}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: this._form,
      },
      'Submitting checkout',
      States.SUBMIT_CHECKOUT,
      [
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
          url: 'processing',
          message: 'Checking order',
          state: States.CHECK_ORDER,
        },
      ],
    );

    this._token = null;
    this._form = '';

    if (nextState) {
      return nextState;
    }

    const body = await data.text();
    if (!this._gateway) {
      const $ = cheerio.load(body, {
        xmlMode: false,
        normalizeWhitespace: true,
      });

      const gatewayInput = $('input[name="checkout[payment_gateway]"]');

      if (gatewayInput) {
        this._gateway = gatewayInput.attr('value');
        this._form = paymentForm(this.context.task.profile, this._gateway, this._token);
      }
    }

    if (/validation failed/i.test(body)) {
      this.context.setCaptchaToken(null);
      return States.CAPTCHA;
    }

    if (/recaptcha/i.test(body) && !this.context.captchaToken) {
      return States.CAPTCHA;
    }

    if (/Your payment can’t be processed/i.test(body)) {
      emitEvent(this.context, [this.context.id], { message: 'Checkout failed' }, Events.TaskStatus);
      return States.GO_TO_PAYMENT;
    }

    if (new RegExp(`${this._hash}/stock_problems`, 'i').test(body)) {
      return States.GO_TO_PAYMENT;
    }

    if (/Calculating taxes/i.test(body)) {
      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Calculating taxes' },
        Events.TaskStatus,
      );

      this._delayer = waitForDelay(250, this._aborter.signal);
      await this._delayer;

      return States.SUBMIT_CHECKOUT;
    }

    const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);
    if (match && match.length) {
      const [, step] = match;

      if (/processing/i.test(step)) {
        return States.CHECK_ORDER;
      }

      if (/contact_information/i.test(step)) {
        return States.GO_TO_CHECKOUT;
      }

      if (/shipping_method/i.test(step)) {
        return States.GO_TO_SHIPPING;
      }

      if (/payment_method/i.test(step)) {
        return States.GO_TO_PAYMENT;
      }

      if (/review/i.test(step)) {
        return States.COMPLETE_CHECKOUT;
      }
    }

    return States.GO_TO_PAYMENT;
  }

  async _handleCompleteCheckout() {
    const {
      task: { captcha },
      captchaToken,
    } = this.context;

    if (!this._form) {
      this._form = completeForm('');
    }

    const { nextState, data } = await this._handler(
      `/${this._store}/checkouts/${this._hash}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: this._form,
      },
      'Completing checkout',
      States.COMPLETE_CHECKOUT,
      [
        {
          url: 'processing',
          message: 'Checking order',
          state: States.CHECK_ORDER,
        },
        {
          url: 'stock_problems',
          message: `Submitting checkout`,
          state: States.GO_TO_PAYMENT,
        },
        {
          url: 'checkpoint',
          message: 'Going to checkpoint',
          state: States.GO_TO_CHECKPOINT,
        },
        {
          url: 'password',
          message: 'Submitting checkout',
          state: States.GO_TO_PAYMENT,
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

    const body = await data.text();
    const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

    if (!match || (match && !match.length)) {
      return States.GO_TO_PAYMENT;
    }

    const [, step] = match;

    if (/processing/i.test(step)) {
      return States.CHECK_ORDER;
    }

    if (/password|review/i.test(step)) {
      return States.COMPLETE_CHECKOUT;
    }

    if (/contact_information/i.test(step)) {
      return States.SUBMIT_CUSTOMER;
    }

    if (/shipping_method/i.test(step)) {
      return States.SUBMIT_SHIPPING;
    }

    if (/stock_problems/i.test(step)) {
      return States.GO_TO_PAYMENT;
    }

    if (/payment_method/i.test(step)) {
      return States.SUBMIT_CHECKOUT;
    }

    if ((/captcha/i.test(body) || captcha) && !captchaToken) {
      return States.CAPTCHA;
    }

    return States.COMPLETE_CHECKOUT;
  }

  async _handleCheckOrder() {
    const {
      task: {
        store: { url, name },
        product: { name: productName, image },
        profile: { name: profileName },
        type,
      },
      webhookManager,
    } = this.context;

    const { nextState, data } = await this._handler(
      `/wallets/checkouts/${this._hash}/payments.json`,
      {
        headers: {
          'content-type': 'application/json',
        },
      },
      'Checking order',
      States.CHECK_ORDER,
    );

    if (nextState) {
      return nextState;
    }

    const body = await data.json();
    const { payments } = body;
    if (!payments || (payments && !payments.length)) {
      return States.CHECK_ORDER;
    }

    const [payment] = payments;

    const bodyString = JSON.stringify(payment);
    const { payment_processing_error_message: processingError } = payment;
    const { checkout } = payment;
    const { currency, payment_due: paymentDue, web_url: webUrl, line_items: lineItems } = checkout;

    const size = lineItems[0].variant_title || lineItems[0].title;
    let productImage = image;
    if (!productImage) {
      productImage = lineItems[0].image_url;
    }

    // success..
    if (/thank_you/i.test(bodyString)) {
      const { order_id: orderName, order_status_url: orderStatusUrl } = checkout;

      webhookManager.insert({
        success: true,
        type,
        checkoutUrl: webUrl,
        product: productName,
        price: currencyWithSymbol(paymentDue, currency),
        store: { name, url },
        order: {
          number: orderName,
          url: orderStatusUrl,
        },
        profile: profileName,
        size,
        image: `${productImage}`.startsWith('http') ? productImage : `https:${productImage}`,
      });

      webhookManager.send();

      emitEvent(
        this.context,
        [this.context.id],
        { message: `Check email! Order #${orderName}` },
        Events.TaskStatus,
      );

      return States.DONE;
    }

    if (processingError !== null) {
      if (!this.webhookSent) {
        this.webhookSent = true;

        webhookManager.insert({
          success: false,
          type,
          checkoutUrl: webUrl,
          product: productName,
          price: currencyWithSymbol(paymentDue, currency),
          store: { name, url },
          order: null,
          profile: profileName,
          size,
          image: `${productImage}`.startsWith('http') ? productImage : `https:${productImage}`,
        });
        webhookManager.send();
      }

      emitEvent(this.context, [this.context.id], { message: 'Checkout failed' }, Events.TaskStatus);

      return States.GO_TO_PAYMENT;
    }

    this._delayer = waitForDelay(500, this._aborter.signal);
    await this._delayer;

    return States.CHECK_ORDER;
  }
}
