/* eslint-disable no-nested-ternary */
import cheerio from 'cheerio';
import { min } from 'lodash';
import { parse } from 'query-string';

import { Bases, Utils, Constants, Classes } from '../../../common';
import { Task as TaskConstants } from '../../constants';
import { Forms, stateForError, getHeaders, pickVariant } from '../../utils';

const { addToCart, parseForm, patchCheckoutForm } = Forms;
const { Task, Manager, Platforms, Monitor } = Constants;
const { currencyWithSymbol, userAgent, waitForDelay, emitEvent } = Utils;
const { BaseTask } = Bases;

const { Events } = Task;
const { Events: TaskManagerEvents } = Manager;
const { States, Modes, StateMap } = TaskConstants;
const { ParseType } = Monitor;
const { Captcha } = Classes;

export default class TaskPrimitive extends BaseTask {
  constructor(context, initState, platform = Platforms.Shopify) {
    super(context, initState, platform);

    if (!this.context.task.store.apiKey) {
      this._state = States.GATHER_DATA;
    } else if (this.context.task.account) {
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

    // checkout specific globals
    this._token = null;
    this._hash = null;
    this._key = null;
    this._store = null;
    this._form = '';
    this._product = null;
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

    emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);

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
        return error.nextState;
      }

      const redirectUrl = headers.get('location');

      if (!redirectUrl) {
        return { data: res };
      }

      // only handle redirects if we have an output map of where we are going...
      if (redirects.length) {
        // eslint-disable-next-line no-restricted-syntax
        for (const { url: path, message: newMsg, state } of redirects) {
          if (new RegExp(path, 'i').test(redirectUrl)) {
            if (/checkouts/i.test(redirectUrl)) {
              [, , , this._store, , this._hash] = redirectUrl.split('/');
            }

            if (/password/i.test(redirectUrl)) {
              emitEvent(
                this.context,
                [this.context.id],
                { message: 'Password page' },
                Events.TaskStatus,
              );
              this._delayer = waitForDelay(monitor, this._aborter.signal);
              // eslint-disable-next-line no-await-in-loop
              await this._delayer;
            }

            if (/throttle/i.test(redirectUrl)) {
              try {
                // eslint-disable-next-line no-await-in-loop
                await this._fetch(redirectUrl, {
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

            if (newMsg) {
              emitEvent(this.context, [this.context.id], { message: newMsg }, Events.TaskStatus);
            }
            return { nextState: state };
          }
        }
      }

      return { data: res };
    } catch (error) {
      this.context.logger.error('Error: %s\n %j', error.status || error.errno, error.message);

      const nextState = stateForError(error, {
        message,
        nextState: from,
      });

      if (nextState) {
        const { message: erroredMessage, nextState: erroredState } = nextState;
        if (erroredMessage) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: erroredMessage },
            Events.TaskStatus,
          );
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

  async _handlePaymentToken() {
    const {
      task: {
        profile: { payment, billing },
        store: { url },
      },
    } = this.context;

    const res = await this._handler(
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
      'Generating session',
      States.PAYMENT_TOKEN,
    );

    const { id } = await res.json();

    if (id) {
      this._token = id;
      return States.SUBMIT_PAYMENT;
    }

    return States.PAYMENT_TOKEN;
  }

  async _handleGatherData() {
    const { data } = await this._handler(
      '/payments/config',
      {},
      'Gathering data',
      States.GATHER_DATA,
    );

    const { status } = data;

    if (status !== 200) {
      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Invalid Shopify store' },
        Events.TaskStatus,
      );

      return States.ERROR;
    }

    const { paymentInstruments } = await data.json();

    const { accessToken } = paymentInstruments;

    if (!accessToken) {
      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Invalid Shopify store' },
        Events.TaskStatus,
      );

      return States.ERROR;
    }

    this.context.task.store.apiKey = accessToken;

    // TODO: subclass determines next state...
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

    emitEvent(
      this.context,
      [this.context.id],
      { message: 'Waiting for captcha' },
      Events.TaskStatus,
    );
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
          state: States.CREATE_CHECKOUT,
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

    return States.GO_TO_CHECKPOINT;
  }

  async _handleBackupCreateCheckout() {
    const {
      aborted,
      logger,
      task: {
        store: { url, apiKey },
        monitor,
        type,
      },
      proxy,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/checkout`, {
        method: 'POST',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        redirect: 'manual',
        follow: 0,
        headers: getHeaders({ url, apiKey }),
        body: JSON.stringify({}),
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Creating checkout',
          nextState: States.CREATE_CHECKOUT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      logger.debug('Create checkout redirect url: %j', redirectUrl);
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkpoint' },
            Events.TaskStatus,
          );
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/login/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Account needed' },
            Events.TaskStatus,
          );
          return States.ERROR;
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
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Creating checkout' },
            Events.TaskStatus,
          );
          return States.CREATE_CHECKOUT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy ? proxy.proxy : null,
              redirect: 'manual',
              follow: 0,
              headers: {
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': userAgent,
                connection: 'close',
                referer: url,
                accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
                host: `${url.split('/')[2]}`,
              },
            });
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );
          return States.QUEUE;
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this._store, , this._hash] = redirectUrl.split('/');

          if (type === Modes.SAFE) {
            emitEvent(
              this.context,
              [this.context.id],
              { message: 'Going to checkout' },
              Events.TaskStatus,
            );
            return States.GO_TO_CHECKOUT;
          }
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting information' },
            Events.TaskStatus,
          );
          return States.SUBMIT_CUSTOMER;
        }
      }

      const message = status ? `Creating checkout (${status})` : 'Creating checkout';
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.CREATE_CHECKOUT;
    } catch (err) {
      logger.error(
        'CHECKOUT: %d Request Error..\n Step: Create Checkout.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Creating checkout',
        nextState: States.CREATE_CHECKOUT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Creating checkout (${err.status || err.errno})`
          : 'Creating checkout';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.CREATE_CHECKOUT;
    }
  }

  async _handleCreateCheckoutWallets() {
    const {
      aborted,
      logger,
      task: {
        store: { url, apiKey },
        monitor,
      },
      proxy,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/wallets/checkouts`, {
        method: 'POST',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        redirect: 'manual',
        follow: 0,
        headers: getHeaders({ url, apiKey }),
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
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Creating checkout',
          nextState: States.CREATE_CHECKOUT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      logger.debug('Create checkout redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkpoint' },
            Events.TaskStatus,
          );
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
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
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Creating checkout' },
            Events.TaskStatus,
          );
          return States.CREATE_CHECKOUT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );
          return States.QUEUE;
        }
      }

      const body = await res.json();

      if (body && body.error) {
        if (/channel is locked/i.test(body.error)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Password page' },
            Events.TaskStatus,
          );
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
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Invalid checkout' },
          Events.TaskStatus,
        );
        return States.CREATE_CHECKOUT;
      }

      if (body && body.checkout) {
        const { web_url: checkoutUrl } = body.checkout;
        if (/checkouts/i.test(checkoutUrl)) {
          [, , , this._store, , this._hash] = checkoutUrl.split('/');
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting information' },
            Events.TaskStatus,
          );
          return States.SUBMIT_CUSTOMER;
        }
      }

      const message = status ? `Creating checkout (${status})` : 'Creating checkout';
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.CREATE_CHECKOUT;
    } catch (err) {
      logger.error(
        'CHECKOUT: %d Request Error..\n Step: Create Checkout.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Creating checkout',
        nextState: States.CREATE_CHECKOUT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Creating checkout (${err.status || err.errno})`
          : 'Creating checkout';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.CREATE_CHECKOUT;
    }
  }

  async _handlePollQueue() {
    const { type } = this.context.task;

    let message;
    let toState;
    const { nextState, data } = this._handler(
      '/checkout/poll?js_poll=1',
      {},
      'Polling queue',
      States.QUEUE,
      [
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

    const { status, headers } = data;

    if (status !== 200) {
      const retryAfter = headers.get('Retry-After') || 2500;

      message = status ? `Not through queue! (${status})` : 'Not through queue!';
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);

      this._delayer = waitForDelay(retryAfter, this._aborter.signal);
      await this._delayer;

      emitEvent(this.context, [this.context.id], { message: 'Polling queue' }, Events.TaskStatus);
      return States.QUEUE;
    }

    const referer = headers.get('referer');

    const response = await this._handler(referer, {});

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

    const retryAfter = headers.get('Retry-After') || 2500;

    message = status ? `Not through queue! (${status})` : 'Not through queue!';
    emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);

    this._delayer = waitForDelay(retryAfter, this._aborter.signal);
    await this._delayer;

    emitEvent(this.context, [this.context.id], { message: 'Polling queue' }, Events.TaskStatus);
    return States.QUEUE;
  }

  async _handleWaitForProduct() {
    const {
      aborted,
      logger,
      parseType,
      task: {
        store: { url },
        product: { variants, randomInStock },
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
        variant = await pickVariant(variants, size, url, logger, randomInStock);
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

      this.context.updateVariant(variant);
      return States.ADD_TO_CART;
    }

    this._delayer = waitForDelay(500, this._aborter.signal);
    await this._delayer;

    return States.WAIT_FOR_PRODUCT;
  }

  async _handleAddToCart() {
    const {
      task: {
        store: { name },
        product: { variant, hash },
        monitor,
      },
    } = this.context;

    const { nextState, data } = await this._handler(
      '/cart/add.js',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: addToCart(variant.id, name, hash),
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

      emitEvent(this.context, [this.context.id], { message: 'Adding to cart' }, Events.TaskStatus);
      return States.ADD_TO_CART;
    }

    return States.DONE;
  }

  async _handleBackupAddToCart() {
    const {
      aborted,
      logger,
      task: {
        store: { url, name, apiKey },
        product: { variant, hash },
        monitor,
      },
      proxy,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let opts = {};
    const base = {
      checkout: {
        line_items: [
          {
            variant_id: variant.id,
            quantity: 1,
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

    if (this._selectedShippingRate.id) {
      opts = {
        shipping_rate: {
          id: this._selectedShippingRate.id,
        },
      };
    }

    try {
      const res = await this._fetch(`/wallets/checkouts/${this._hash}.json`, {
        method: 'PATCH',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        headers: {
          ...getHeaders({ url, apiKey }),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ...base,
          checkout: {
            ...base.checkout,
            ...opts,
          },
        }),
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Adding to cart',
          nextState: States.ADD_TO_CART,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      logger.silly('API CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      // check redirects
      if (redirectUrl) {
        if (/password/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Password page' },
            Events.TaskStatus,
          );
          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;
          const message = this._isRestocking ? 'Checking stock' : 'Adding to cart';
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
          return States.ADD_TO_CART;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );
          return States.QUEUE;
        }
      }

      const body = await res.json();
      if (body.errors && body.errors.line_items) {
        const error = body.errors.line_items[0];
        logger.silly('Error adding to cart: %j', error);
        if (error && error.quantity) {
          // TODO: investigate this
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );
          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;
          const message = this._isRestocking ? 'Checking stock' : 'Adding to cart';
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
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
          const message = this._isRestocking ? 'Checking stock' : 'Adding to cart';
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
          return States.ADD_TO_CART;
        }

        const message = status ? `Adding to cart – (${status})` : 'Adding to cart';
        emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        return States.ADD_TO_CART;
      }

      if (body.checkout && body.checkout.line_items && body.checkout.line_items.length) {
        this.context.task.product.name = body.checkout.line_items[0].title;
        this.context.task.product.image = body.checkout.line_items[0].image_url.startsWith('http')
          ? body.checkout.line_items[0].image_url
          : `http:${body.checkout.line_items[0].image_url}`;

        if (this._isRestocking) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );
          return States.PAYMENT_TOKEN;
        }

        if (this._selectedShippingRate.id) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );
          return States.PAYMENT_TOKEN;
        }
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Going to checkout' },
          Events.TaskStatus,
        );
        return States.GO_TO_CHECKOUT;
      }
      const message = status ? `Adding to cart – (${status})` : 'Adding to cart';
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.ADD_TO_CART;
    } catch (err) {
      logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Add to Cart.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Adding to cart',
        nextState: States.ADD_TO_CART,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno ? `Adding to cart (${err.status || err.errno})` : 'Adding to cart';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.ADD_TO_CART;
    }
  }

  async _handleGoToCart() {
    const {
      logger,
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

      logger.info('Cart form value detected: { name: %j, value: %j }', name, value);
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
    const {
      aborted,
      logger,
      task: { type },
    } = this.context;
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

      const requester = await Captcha.getCaptcha(
        this.context,
        this._handleHarvest,
        this._platform,
        this._prevState === States.GO_TO_CHECKPOINT ? 1 : 0,
      );
      this.context.setCaptchaRequest(requester);
    }

    // Check the status of the request
    switch (this.context.captchaRequest.status) {
      case 'pending': {
        // waiting for token, sleep for delay and then return same state to check again
        await new Promise(resolve => setTimeout(resolve, 500));

        // TODO: check cookies to see if it's been updated...
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
          if (type === Modes.FAST) {
            emitEvent(
              this.context,
              [this.context.id],
              { message: 'Submitting payment' },
              Events.TaskStatus,
            );
            return States.PAYMENT_TOKEN;
          }
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting shipping' },
            Events.TaskStatus,
          );

          return States.SUBMIT_SHIPPING;
        }

        // only happens in safe mode
        if (this._prevState === States.GO_TO_CART) {
          emitEvent(this.context, [this.context.id], { message: 'Logging in' }, Events.TaskStatus);

          return States.LOGIN;
        }

        if (this._prevState === States.GO_TO_CHECKPOINT) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting checkpoint' },
            Events.TaskStatus,
          );

          return States.SUBMIT_CHECKPOINT;
        }

        if (this._prevState === States.GO_TO_CHECKOUT) {
          if (type === Modes.FAST) {
            if (this._selectedShippingRate.id) {
              emitEvent(
                this.context,
                [this.context.id],
                { message: 'Submitting payment' },
                Events.TaskStatus,
              );
              return States.PAYMENT_TOKEN;
            }
            emitEvent(
              this.context,
              [this.context.id],
              { message: 'Fetching rates' },
              Events.TaskStatus,
            );
            return States.GO_TO_SHIPPING;
          }
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting information' },
            Events.TaskStatus,
          );
          return States.SUBMIT_CUSTOMER;
        }

        if (this._prevState === States.SUBMIT_PAYMENT) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
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
          url: 'stock_problems',
          message: 'Going to checkout',
          state: States.GO_TO_CHECKOUT,
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

    if (!this._key) {
      try {
        // grab the checkoutKey if it's exists and we don't have it yet..
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._key] = match;
        }
      } catch (e) {
        // fail silently..
      }
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

    // recaptcha sitekey parser...
    const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
    if (match && match.length) {
      [, this.context.task.store.sitekey] = match;
    }

    if ((/recaptcha/i.test(body) || captcha) && !captchaToken) {
      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Waiting for captcha' },
        Events.TaskStatus,
      );

      return States.CAPTCHA;
    }

    emitEvent(
      this.context,
      [this.context.id],
      { message: 'Submitting information' },
      Events.TaskStatus,
    );

    return States.SUBMIT_CUSTOMER;
  }

  async _handleSubmitCustomer() {
    const {
      task: {
        store: { apiKey },
      },
      captchaToken,
    } = this.context;

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

    const { nextState } = await this._handler(
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
          url: 'stock_problems',
          message: 'Submitting information',
          state: States.GO_TO_CHECKOUT,
        },
      ],
    );

    if (nextState) {
      return nextState;
    }

    // determined by subclasses..
    return States.DONE;
  }

  async _handleBackupSubmitCustomer() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        profile: { shipping, billing, payment, billingMatchesShipping },
        store: { url, apiKey },
      },
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`/wallets/checkouts/${this._hash}.json`, {
        method: 'PATCH',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
        },
        body: JSON.stringify(patchCheckoutForm(billingMatchesShipping, shipping, billing, payment)),
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Submitting information',
          nextState: States.SUBMIT_CUSTOMER,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      // if we followed a redirect at some point...
      const redirectUrl = headers.get('location');
      if (redirectUrl) {
        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );

          return States.QUEUE;
        }
      }

      const body = await res.json();

      if (
        body &&
        body.checkout &&
        !body.checkout.shipping_address &&
        !body.checkout.billing_address
      ) {
        const message = status ? `Submitting information – (${status})` : 'Submitting information';
        emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        return States.SUBMIT_CUSTOMER;
      }

      if (this._isRestocking) {
        if (!this._selectedShippingRate.id) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Fetching rates' },
            Events.TaskStatus,
          );

          return States.GO_TO_SHIPPING;
        }

        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Submitting shipping' },
          Events.TaskStatus,
        );
        return States.SUBMIT_SHIPPING;
      }

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

      return States.WAIT_FOR_PRODUCT;
    } catch (err) {
      logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Submitting Information.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting information',
        nextState: States.SUBMIT_CUSTOMER,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting information (${err.status || err.errno})`
          : 'Submitting information';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.SUBMIT_CUSTOMER;
    }
  }

  async _handleGetShipping() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        store: { url, apiKey },
        monitor,
        captcha,
        type,
      },
      captchaToken,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._isRestocking || type === Modes.FAST) {
      return this._handleBackupGetShipping();
    }

    try {
      const res = await this._fetch(
        this._redirectUrl || `/${this._store}/checkouts/${this._hash}`,
        {
          method: 'GET',
          compress: true,
          agent: proxy ? proxy.proxy : null,
          redirect: 'manual',
          follow: 0,
          headers: {
            ...getHeaders({ url, apiKey }),
            Connection: 'Keep-Alive',
            'Upgrade-Insecure-Requests': '1',
            'X-Shopify-Storefront-Access-Token': apiKey,
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
          },
        },
      );

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Fetching rates',
          nextState: States.GO_TO_SHIPPING,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const body = await res.text();
      const $ = cheerio.load(body, {
        xmlMode: false,
        normalizeWhitespace: true,
      });

      // grab the checkoutKey if it's exists and we don't have it yet..
      if (!this._key) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._key] = match;
          logger.silly('CHECKOUT: Checkout authorization key: %j', this._key);
        }
      }

      let checkoutUrl;
      if (this._store && this._hash && this._key) {
        checkoutUrl = `${url}/${this._store}/checkouts/${this._hash}?key=${this._key}`;
        // TODO: toggle to send the checkout link to discord
        this._checkoutUrl = checkoutUrl;
      }

      const redirectUrl = headers.get('location');
      logger.silly(`CHECKOUT: Get shipping redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkpoint' },
            Events.TaskStatus,
          );

          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
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

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting shipping' },
            Events.TaskStatus,
          );

          return States.GO_TO_SHIPPING;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );

          return States.QUEUE;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting shipping' },
            Events.TaskStatus,
          );

          return States.GO_TO_SHIPPING;
        }
      }

      if (/stock_problems/i.test(body)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: `Out of stock! Delaying ${monitor}ms` },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;

        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Submitting shipping' },
          Events.TaskStatus,
        );
        return States.GO_TO_SHIPPING;
      }

      if (/Getting available shipping rates/i.test(body)) {
        emitEvent(this.context, [this.context.id], { message: 'Polling rates' }, Events.TaskStatus);

        this._delayer = waitForDelay(1000, this._aborter.signal);
        await this._delayer;

        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Submitting shipping' },
          Events.TaskStatus,
        );

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
        logger.debug('PARSED SITEKEY!: %j', this.context.task.store.sitekey);
      }

      if ((/recaptcha/i.test(body) || captcha) && !captchaToken) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Waiting for captcha' },
          Events.TaskStatus,
        );

        return States.CAPTCHA;
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Submitting shipping' },
        Events.TaskStatus,
      );

      return States.SUBMIT_SHIPPING;
    } catch (err) {
      logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Get shipping .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Fetching rates',
        nextState: States.GO_TO_SHIPPING,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno ? `Fetching rates (${err.status || err.errno})` : 'Fetching rates';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.GO_TO_SHIPPING;
    }
  }

  async _handleBackupGetShipping() {
    const {
      aborted,
      proxy,
      logger,
      task: {
        store: { url, apiKey },
        captcha,
      },
      captchaToken,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`/wallets/checkouts/${this._hash}/shipping_rates.json`, {
        method: 'GET',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        headers: getHeaders({ url, apiKey }),
      });

      const { status } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Fetching rates',
          nextState: States.GO_TO_SHIPPING,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      if (status === 422) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Country not supported' },
          Events.TaskStatus,
        );

        return States.ERROR;
      }

      const body = await res.json();
      if (body && body.errors) {
        logger.silly('CHECKOUT: Error getting shipping rates: %j', body.errors);
        const { checkout } = body.errors;
        if (checkout) {
          const errorMessage = JSON.stringify(checkout);
          if (errorMessage.indexOf('does_not_require_shipping') > -1) {
            logger.silly('API CHECKOUT: Cart empty, retrying add to cart');

            if (this._isRestocking) {
              emitEvent(
                this.context,
                [this.context.id],
                { message: 'Adding to cart' },
                Events.TaskStatus,
              );

              return States.ADD_TO_CART;
            }

            if (captcha && !captchaToken) {
              emitEvent(
                this.context,
                [this.context.id],
                { message: 'Waiting for captcha' },
                Events.TaskStatus,
              );

              return States.CAPTCHA;
            }

            emitEvent(
              this.context,
              [this.context.id],
              { message: 'Submitting payment' },
              Events.TaskStatus,
            );

            return States.PAYMENT_TOKEN;
          }

          if (errorMessage.indexOf("can't be blank") > -1) {
            emitEvent(
              this.context,
              [this.context.id],
              { message: 'Submitting information' },
              Events.TaskStatus,
            );

            return States.SUBMIT_CUSTOMER;
          }
        }

        emitEvent(this.context, [this.context.id], { message: 'Polling rates' }, Events.TaskStatus);

        this._delayer = waitForDelay(1000, this._aborter.signal);
        await this._delayer;

        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Fetching rates' },
          Events.TaskStatus,
        );

        return States.GO_TO_SHIPPING;
      }

      if (body && body.shipping_rates && body.shipping_rates.length > 0) {
        const { shipping_rates: shippingRates } = body;

        const cheapest = min(shippingRates, rate => rate.price);
        this._selectedShippingRate = { id: cheapest.id, name: cheapest.title };

        if (captcha && !captchaToken) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Waiting for captcha' },
            Events.TaskStatus,
          );

          return States.CAPTCHA;
        }

        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Submitting payment' },
          Events.TaskStatus,
        );

        return States.PAYMENT_TOKEN;
      }

      emitEvent(this.context, [this.context.id], { message: 'Polling rates' }, Events.TaskStatus);

      this._delayer = waitForDelay(1000, this._aborter.signal);
      await this._delayer;

      emitEvent(this.context, [this.context.id], { message: 'Fetching rates' }, Events.TaskStatus);

      return States.GO_TO_SHIPPING;
    } catch (err) {
      logger.error(
        'CHECKOUT: %s Request Error..\n Step: Shipping Rates.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Fetching rates',
        nextState: States.GO_TO_SHIPPING,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno ? `Fetching rates (${err.status || err.errno})` : 'Fetching rates';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.GO_TO_SHIPPING;
    }
  }

  async _handleSubmitShipping() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        monitor,
        store: { url, apiKey },
      },
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`/${this._store}/checkouts/${this._hash}`, {
        method: 'POST',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'content-type': 'application/x-www-form-urlencoded',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        },
        body: this._form,
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Submitting shipping',
          nextState: States.SUBMIT_SHIPPING,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      // if we followed a redirect at some point...
      const redirectUrl = headers.get('location');
      logger.error('SUBMIT SHIPPING REDIRECT URL: %s', redirectUrl);
      if (redirectUrl) {
        this._redirectUrl = redirectUrl;
        if (/processing/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Processing payment' },
            Events.TaskStatus,
          );

          return States.PROCESS_PAYMENT;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting shipping' },
            Events.TaskStatus,
          );

          return States.SUBMIT_SHIPPING;
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

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting shipping' },
            Events.TaskStatus,
          );

          return States.SUBMIT_SHIPPING;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );

          return States.QUEUE;
        }

        if (/step=stock_problems/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting information' },
            Events.TaskStatus,
          );

          return States.GO_TO_PAYMENT;
        }

        if (/step=payment_method/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );

          return States.GO_TO_PAYMENT;
        }

        if (/step=shipping_method/i.test(redirectUrl)) {
          this.context.setCaptchaToken(null);

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Fetching rates' },
            Events.TaskStatus,
          );

          return States.GO_TO_SHIPPING;
        }

        if (/step=contact_information/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting information' },
            Events.TaskStatus,
          );

          return States.GO_TO_CHECKOUT;
        }
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Submitting shipping' },
        Events.TaskStatus,
      );

      return States.GO_TO_SHIPPING;
    } catch (err) {
      logger.error(
        'CHECKOUT: %s Request Error..\n Step: Submit shipping .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting shipping',
        nextState: States.SUBMIT_SHIPPING,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting shipping (${err.status || err.errno})`
          : 'Submitting shipping';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.SUBMIT_SHIPPING;
    }
  }

  async _handleGetPayment() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        monitor,
        store: { url, apiKey },
        captcha,
      },
      captchaToken,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(
        this._redirectUrl || `/${this._store}/checkouts/${this._hash}`,
        {
          method: 'GET',
          compress: true,
          agent: proxy ? proxy.proxy : null,
          redirect: 'manual',
          follow: 0,
          headers: {
            ...getHeaders({ url, apiKey }),
            Connection: 'Keep-Alive',
            'Upgrade-Insecure-Requests': '1',
            'X-Shopify-Storefront-Access-Token': apiKey,
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
          },
        },
      );

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Submitting payment',
          nextState: States.GO_TO_PAYMENT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const body = await res.text();
      const $ = cheerio.load(body, {
        xmlMode: false,
        normalizeWhitespace: true,
      });

      const priceRecap = $('.total-recap__final-price').attr('data-checkout-payment-due-target');

      // grab the checkoutKey if it's exists and we don't have it yet..
      if (!this._key) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._key] = match;
          logger.silly('CHECKOUT: Checkout authorization key: %j', this._key);
        }
      }

      let checkoutUrl;
      if (this._store && this._hash && this._key) {
        checkoutUrl = `${url}/${this._store}/checkouts/${this._hash}?key=${this._key}`;
        // TODO: toggle to send the checkout link to discord
        this._checkoutUrl = checkoutUrl;
      }

      const redirectUrl = headers.get('location');
      logger.silly(`CHECKOUT: Get payment redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        this._redirectUrl = redirectUrl;
        if (/checkpoint/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkpoint' },
            Events.TaskStatus,
          );

          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
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

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );

          return States.GO_TO_PAYMENT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );

          return States.QUEUE;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );

          return States.GO_TO_PAYMENT;
        }
      }

      if (/calculating taxes/i.test(body) || /polling/i.test(body)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Calculating taxes' },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(1000, this._aborter.signal);
        await this._delayer;

        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Submitting payment' },
          Events.TaskStatus,
        );

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

      // recaptcha sitekey parser...
      const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
      if (match && match.length) {
        [, this.context.task.store.sitekey] = match;
        logger.debug('PARSED SITEKEY!: %j', this.context.task.store.sitekey);
      }

      if ((/recaptcha/i.test(body) || captcha) && !captchaToken) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Waiting for captcha' },
          Events.TaskStatus,
        );

        return States.CAPTCHA;
      }

      if (!this._token && priceRecap !== '0') {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Submitting payment' },
          Events.TaskStatus,
        );

        return States.PAYMENT_TOKEN;
      }

      this._isFreeCheckout = true;

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Submitting payment' },
        Events.TaskStatus,
      );

      return States.SUBMIT_PAYMENT;
    } catch (err) {
      logger.error(
        'CHECKOUT: %s Request Error..\n Step: Get payment .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting payment',
        nextState: States.GO_TO_PAYMENT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting payment (${err.status || err.errno})`
          : 'Submitting payment';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.GO_TO_PAYMENT;
    }
  }

  async _handleSubmitPayment() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        monitor,
        store: { url, apiKey },
        type,
      },
    } = this.context;

    if (type === Modes.FAST) {
      return this._handleBackupSubmitPayment();
    }

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._isFreeCheckout) {
      const parts = this._form.split('&');

      if (parts && parts.length) {
        this._form = '';
        parts.forEach(part => {
          if (/authenticity_token/i.test(part)) {
            this._form += `_method=patch&${part}&previous_step=payment_method&step=&s=&checkout%5Bcredit_card%5D%5Bvault%5D=false&checkout%5Bpayment_gateway%5D=free&checkout%5Btotal_price%5D=0&complete=1&checkout%5Bclient_details%5D%5Bbrowser_width%5D=1721&checkout%5Bclient_details%5D%5Bbrowser_height%5D=927&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1&checkout%5Bclient_details%5D%5Bcolor_depth%5D=24&checkout%5Bclient_details%5D%5Bjava_enabled%5D=false&checkout%5Bclient_details%5D%5Bbrowser_tz%5D=240`;
          }
        });
      }
    } else if (this._form.indexOf(this._token) === -1) {
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

    try {
      const res = await this._fetch(`/${this._store}/checkouts/${this._hash}`, {
        method: 'POST',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'content-type': 'application/x-www-form-urlencoded',
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        },
        body: this._form,
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Submitting payment',
          nextState: States.GO_TO_PAYMENT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      this.needsPaymentToken = true;
      this._token = '';

      const body = await res.text();
      const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

      if (/stock_problems/i.test(body)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: `Out of stock! Delaying ${monitor}ms` },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Submitting payment' },
          Events.TaskStatus,
        );

        return States.SUBMIT_PAYMENT;
      }

      if (/Your payment can’t be processed/i.test(body)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Processing error' },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;

        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Submitting payment' },
          Events.TaskStatus,
        );

        return States.SUBMIT_PAYMENT;
      }

      if (/captcha/i.test(body)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Waiting for captcha' },
          Events.TaskStatus,
        );

        return States.CAPTCHA;
      }

      // if we followed a redirect at some point...
      const redirectUrl = headers.get('location');
      if (redirectUrl) {
        this._redirectUrl = redirectUrl;
        if (/processing/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Processing payment' },
            Events.TaskStatus,
          );

          return States.PROCESS_PAYMENT;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );

          return States.SUBMIT_PAYMENT;
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

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );

          return States.SUBMIT_PAYMENT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );

          return States.QUEUE;
        }
      }

      // step tests
      if (match && match.length) {
        const [, step] = match;

        if (/processing/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Processing payment' },
            Events.TaskStatus,
          );

          return States.PROCESS_PAYMENT;
        }

        if (/contact_information/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting information' },
            Events.TaskStatus,
          );

          return States.GO_TO_CHECKOUT;
        }

        if (/shipping_method/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Fetching rates' },
            Events.TaskStatus,
          );

          return States.GO_TO_SHIPPING;
        }

        if (/payment_method/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );

          return States.GO_TO_PAYMENT;
        }

        if (/review/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.GO_TO_PAYMENT;
        }
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Submitting payment' },
        Events.TaskStatus,
      );
      return States.GO_TO_PAYMENT;
    } catch (err) {
      logger.error(
        'CHECKOUT: %s Request Error..\n Step: Submit shipping information .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting payment',
        nextState: States.SUBMIT_PAYMENT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting payment (${err.status || err.errno})`
          : 'Submitting payment';

      return nextState || { message, nextState: States.SUBMIT_PAYMENT };
    }
  }

  async _handleBackupSubmitPayment() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        monitor,
        store: { url, apiKey },
        captcha,
      },
      captchaToken,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { id } = this._selectedShippingRate;

    let form = {
      complete: 1,
      s: this._token,
      checkout: {
        shipping_rate: {
          id,
        },
      },
    };

    if (captchaToken) {
      form = {
        ...form,
        'g-recaptcha-response': captchaToken,
      };
    }

    try {
      const res = await this._fetch(`/${this._store}/checkouts/${this._hash}`, {
        method: 'PATCH',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        follow: 0,
        redirect: 'manual',
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify(form),
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Submitting payment',
          nextState: States.SUBMIT_PAYMENT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      logger.silly('CHECKOUT: Post payment redirect url: %s', redirectUrl);

      const body = await res.text();

      if (!this._key) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._key] = match;
          logger.silly('CHECKOUT: Checkout authorization key: %j', this._key);
        }
      }

      let checkoutUrl;
      if (this._store && this._hash && this._key) {
        checkoutUrl = `${url}/${this._store}/checkouts/${this._hash}?key=${this._key}`;
        // TODO: toggle to send the checkout link to discord
        this._checkoutUrl = checkoutUrl;
      }

      // check if redirected
      if (redirectUrl) {
        if (/processing/i.test(redirectUrl)) {
          this.context.setCaptchaToken(null);
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Processing payment' },
            Events.TaskStatus,
          );

          return States.PROCESS_PAYMENT;
        }

        if (/checkpoint/i.test(redirectUrl)) {
          this.checkpointUrl = redirectUrl;
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkpoint' },
            Events.TaskStatus,
          );

          return States.GO_TO_CHECKPOINT;
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
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );
          return States.SUBMIT_PAYMENT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );

          return States.QUEUE;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }
      }

      if ((/captcha/i.test(body) || captcha) && !captchaToken) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Waiting for captcha' },
          Events.TaskStatus,
        );

        return States.CAPTCHA;
      }

      const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);
      if (match && /review/i.test(match)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Completing payment' },
          Events.TaskStatus,
        );

        return States.COMPLETE_PAYMENT;
      }

      if (match && /payment/i.test(match)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Submitting payment' },
          Events.TaskStatus,
        );

        return States.SUBMIT_PAYMENT;
      }

      if (match && /shipping/i.test(match)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Submitting shipping' },
          Events.TaskStatus,
        );

        return States.SUBMIT_SHIPPING;
      }

      if (match && /process/i.test(match)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Processing payment' },
          Events.TaskStatus,
        );

        return States.PROCESS_PAYMENT;
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Submitting payment' },
        Events.TaskStatus,
      );
      return States.SUBMIT_PAYMENT;
    } catch (err) {
      logger.error(
        'CHECKOUT: %s Request Error..\n Step: Post Payment.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting payment',
        nextState: States.SUBMIT_PAYMENT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting payment (${err.status || err.errno})`
          : 'Submitting payment';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.SUBMIT_PAYMENT;
    }
  }

  async _handleCompletePayment() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        monitor,
        store: { url, apiKey },
        type,
        captcha,
      },
      captchaToken,
    } = this.context;

    if (type === Modes.FAST) {
      return this._handleBackupCompletePayment();
    }

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`/${this._store}/checkouts/${this._hash}`, {
        method: 'POST',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'content-type': 'application/x-www-form-urlencoded',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        },
        body: this._form,
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Completing payment',
          nextState: States.COMPLETE_PAYMENT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const body = await res.text();
      const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

      const redirectUrl = headers.get('location');
      if (match && match.length) {
        const [, step] = match;

        if (/processing/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Processing payment' },
            Events.TaskStatus,
          );
          return States.PROCESS_PAYMENT;
        }

        if (/stock_problems/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }

        if (/password/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Password page' },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }

        if (/throttle/i.test(step)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );
          return States.QUEUE;
        }

        if (/contact_information/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting information' },
            Events.TaskStatus,
          );

          return States.SUBMIT_CUSTOMER;
        }

        if (/shipping_method/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting shipping' },
            Events.TaskStatus,
          );

          return States.SUBMIT_SHIPPING;
        }

        if (/payment_method/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );

          return States.SUBMIT_PAYMENT;
        }

        if (/review/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }
      }

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this.checkpointUrl = redirectUrl;
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkpoint' },
            Events.TaskStatus,
          );

          return States.GO_TO_CHECKPOINT;
        }

        if (/stock_problems/.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }

        if (/processing/.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Processing payment' },
            Events.TaskStatus,
          );

          return States.PROCESS_PAYMENT;
        }

        if (/password/.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Password page' },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }

        if (/throttle/.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );

          return States.QUEUE;
        }
      }

      if (/stock_problems/i.test(body)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: `Out of stock! Delaying ${monitor}ms` },
          Events.TaskStatus,
        );

        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;

        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Completing payment' },
          Events.TaskStatus,
        );
        return States.COMPLETE_PAYMENT;
      }

      // recaptcha sitekey parser...
      const key = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
      if (key && key.length) {
        [, this.context.task.store.sitekey] = key;
        logger.debug('PARSED SITEKEY!: %j', this.context.task.store.sitekey);
      }

      if ((/recaptcha/i.test(body) || captcha) && !captchaToken) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Waiting for captcha' },
          Events.TaskStatus,
        );

        return States.CAPTCHA;
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Completing payment' },
        Events.TaskStatus,
      );

      return States.COMPLETE_PAYMENT;
    } catch (err) {
      logger.error(
        'CHECKOUT: %s Request Error..\n Step: Completing payment .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Completing payment',
        nextState: States.COMPLTE_PAYMENT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Completing payment (${err.status || err.errno})`
          : 'Completing payment';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.COMPLTE_PAYMENT;
    }
  }

  async _handleBackupCompletePayment() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        store: { url, apiKey },
        monitor,
        captcha,
      },
      captchaToken,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let form = {
      complete: 1,
    };

    if (captchaToken) {
      form = {
        ...form,
        'g-recaptcha-response': captchaToken,
      };
    }

    try {
      const res = await this._fetch(`/${this._store}/checkouts/${this._hash}`, {
        method: 'PATCH',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        follow: 0,
        redirect: 'manual',
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify(form),
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Completing payment',
          nextState: States.COMPLETE_PAYMENT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const body = await res.text();

      if (!this._key) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._key] = match;
          logger.silly('CHECKOUT: Checkout authorization key: %j', this._key);
        }
      }

      let checkoutUrl;
      if (this._store && this._hash && this._key) {
        checkoutUrl = `${url}/${this._store}/checkouts/${this._hash}?key=${this._key}`;
        this._checkoutUrl = checkoutUrl;
      }

      const redirectUrl = headers.get('location');
      if (redirectUrl) {
        if (/processing/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Processing payment' },
            Events.TaskStatus,
          );

          return States.PROCESS_PAYMENT;
        }

        if (/checkpoint/i.test(redirectUrl)) {
          this.checkpointUrl = redirectUrl;
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkpoint' },
            Events.TaskStatus,
          );

          return States.GO_TO_CHECKPOINT;
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

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );

          return States.QUEUE;
        }
      }

      if ((/captcha/i.test(body) || captcha) && !captchaToken) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Waiting for captcha' },
          Events.TaskStatus,
        );

        return States.CAPTCHA;
      }

      const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);

      if (match && match.length) {
        const [, step] = match;

        if (/processing/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Processing payment' },
            Events.TaskStatus,
          );

          return States.PROCESS_PAYMENT;
        }

        if (/stock_problems/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: `Out of stock! Delaying ${monitor}ms` },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }

        if (/password/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Password page' },
            Events.TaskStatus,
          );

          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }

        if (/throttle/i.test(step)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
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
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );

          return States.QUEUE;
        }

        if (/contact_information/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting information' },
            Events.TaskStatus,
          );

          return States.SUBMIT_CUSTOMER;
        }

        if (/shipping_method/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting shipping' },
            Events.TaskStatus,
          );

          return States.SUBMIT_SHIPPING;
        }

        if (/payment_method/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );

          return States.SUBMIT_PAYMENT;
        }

        if (/review/i.test(step)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Completing payment' },
            Events.TaskStatus,
          );

          return States.COMPLETE_PAYMENT;
        }
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Completing payment' },
        Events.TaskStatus,
      );

      return States.COMPLETE_PAYMENT;
    } catch (err) {
      logger.error(
        'CHECKOUT: %s Request Error..\n Step: Complete Payment.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Completing payment',
        nextState: States.COMPLETE_PAYMENT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Completing payment (${err.status || err.errno})`
          : 'Completing payment';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.COMPLETE_PAYMENT;
    }
  }

  async _handlePaymentProcess() {
    const {
      aborted,
      logger,
      task: {
        store: { url, apiKey, name },
        product: { size, name: productName, image },
        profile: { name: profileName },
        oneCheckout,
        type,
      },
      proxy,
      webhookManager,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/wallets/checkouts/${this._hash}/payments`, {
        method: 'GET',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        redirect: 'manual',
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
      });

      const body = await res.json();

      const { status } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Processing payment',
          nextState: States.PROCESS_PAYMENT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const { checkout } = body;

      const bodyString = JSON.stringify(body);

      if (checkout) {
        const {
          currency,
          payment_due: paymentDue,
          web_url: webUrl,
          line_items: lineItems,
          payments,
        } = checkout;

        let productImage = image;
        if (!productImage) {
          productImage = lineItems[0].image_url;
        }

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
          if (oneCheckout) {
            this._events.emit(TaskManagerEvents.Success, this.context.task);
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: `Success! Order ${orderName} placed.` },
            Events.TaskStatus,
          );

          return States.DONE;
        }

        if (/issue processing|your card was declined/i.test(bodyString)) {
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

          const rewindToState =
            type === Modes.FAST || /dsm sg|dsm jp|dsm uk/i.test(name)
              ? States.PAYMENT_TOKEN
              : States.GO_TO_PAYMENT;
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Payment failed' },
            Events.TaskStatus,
          );

          return rewindToState;
        }

        const { payment_processing_error_message: paymentProcessingErrorMessage } = payments[0];

        if (paymentProcessingErrorMessage !== null) {
          if (/no longer available/i.test(paymentProcessingErrorMessage)) {
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
                image: `${productImage}`.startsWith('http')
                  ? productImage
                  : `https:${productImage}`,
              });
              webhookManager.send();
            }

            const rewindToState =
              type === Modes.FAST || /dsm sg|dsm jp|dsm uk/i.test(name)
                ? States.PAYMENT_TOKEN
                : States.GO_TO_PAYMENT;

            emitEvent(
              this.context,
              [this.context.id],
              { message: 'Payment failed' },
              Events.TaskStatus,
            );

            return rewindToState;
          }

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

          const rewindToState =
            type === Modes.FAST || /dsm sg|dsm jp|dsm uk/i.test(name)
              ? States.PAYMENT_TOKEN
              : States.GO_TO_PAYMENT;

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Payment failed' },
            Events.TaskStatus,
          );

          return rewindToState;
        }
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Processing payment' },
        Events.TaskStatus,
      );

      this._delayer = waitForDelay(1000, this._aborter.signal);
      await this._delayer;

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Processing payment' },
        Events.TaskStatus,
      );
      return States.PROCESS_PAYMENT;
    } catch (err) {
      logger.error(
        'CHECKOUT: %s Request Error..\n Step: Process Payment.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.PROCESS_PAYMENT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Processing payment (${err.status || err.errno})`
          : 'Processing payment';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.PROCESS_PAYMENT;
    }
  }

  async _handleStepLogic(currentState) {
    const { logger } = this.context;
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.LOGIN]: this._handleLogin,
      [States.PAYMENT_TOKEN]: this._handlePaymentToken,
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
