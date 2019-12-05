/* eslint-disable no-nested-ternary */
import cheerio from 'cheerio';
import { min, isEmpty } from 'lodash';
import { parse } from 'query-string';

import notification from '../hooks';
import { Classes, Bases, Utils, Constants } from '../../common';
import { Task as TaskConstants, Monitor } from '../constants';
import { Forms, stateForError, getHeaders, pickVariant } from '../utils';

const { addToCart, parseForm, patchCheckoutForm } = Forms;
const { Task, Manager, Platforms } = Constants;
const { currencyWithSymbol, userAgent, waitForDelay } = Utils;
const { Timer } = Classes;
const { BaseTask } = Bases;

const { Events } = Task;
const { Events: TaskManagerEvents } = Manager;
const { States, Modes, StateMap } = TaskConstants;
const { ParseType } = Monitor;

export default class TaskPrimitive extends BaseTask {
  constructor(context, platform = Platforms.Shopify) {
    super(context, platform);
    this._timers = {
      checkout: new Timer(),
      monitor: new Timer(),
    };

    this._needsLogin = this._context.task.account || false;
    this._state = States.STARTED;
    this.checkpointUrl = '/checkpoint'; // default to normal checkpoint
    this._backupCheckout = false;

    // decide what our start state should be!
    if (!this._context.task.store.apiKey) {
      this._state = States.GATHER_DATA;
    } else if (this._needsLogin) {
      this._state = States.LOGIN;
    } else if (this._context.task.type === Modes.FAST) {
      this._state = States.CREATE_CHECKOUT;
    } else {
      this._state = States.WAIT_FOR_PRODUCT;
    }

    this._deregisterOverride = false;

    this._history = [];

    const preFetchedShippingRates = this._context.task.profile.rates.find(
      r => r.store.url === this._context.task.store.url,
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
    this._shippingMethods = [];
    this._captchaToken = null;
    this._webhookSent = false;
    this._captchaTokenRequest = null;
    this._cartForm = '';
    this._paymentToken = null;
    this._checkoutUrl = null;
    this._redirectUrl = null;
    this._checkoutToken = null;
    this._checkoutKey = null;
    this._storeId = null;

    this._prices = {
      cart: 0,
      shipping: 0,
      taxes: 0,
      total: 0,
    };

    // safe mode includes
    this._checkpointForm = '';
    this._formValues = '';
    this._isFreeCheckout = false;
    this._isChecking = false;
    this._isRestocking = false;
    this._previousProxy = '';
  }

  _handleHarvest(id, token) {
    const { id: thisId, captchaQueue } = this._context;

    if (id !== thisId || !captchaQueue) {
      return null;
    }

    return captchaQueue.insert(token);
  }

  async getCookie(jar, name) {
    const store = jar.Store || jar.store;

    if (!store) {
      return null;
    }

    let found = null;
    store.getAllCookies((_, cookies) => {
      for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i];
        this._logger.info(`Cookie key/value: %j/%j`, cookie.key, cookie.value);
        if (cookie.key.indexOf(name) > -1) {
          this._logger.debug('Found existing ctd cookie %j', cookie.value);
          found = cookie.value;
          break;
        }
      }
    });
    return found;
  }

  // MARK: State Machine Step Logic
  async _handleLogin() {
    const {
      aborted,
      task: {
        store: { url },
        account: { username, password },
        monitorDelay,
        type,
      },
      proxy,
      rawProxy,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const form = new URLSearchParams();
    let heads = {
      'User-Agent': userAgent,
    };

    if (this._captchaToken) {
      form.append('utf8', '✓');
      form.append('authenticity_token', '');
      form.append('g-recaptcha-response', this._captchaToken);
      heads = {
        ...heads,
        Referer: `${url}/challenge`,
      };
    } else {
      form.append('form_data', 'customer_login');
      form.append('utf8', '✓');
      form.append('customer[email]', username);
      form.append('customer[password]', password);
      form.append('Referer', `${url}/account/login`);
    }

    try {
      const res = await this._fetch(`${url}/account/login`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: heads,
        body: form,
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Logging in',
          nextState: States.LOGIN,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', proxy: rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', proxy: rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Logging in' });
          return States.LOGIN;
        }

        // DON'T SET `this._needsLogin` to false
        if (/challenge/i.test(redirectUrl)) {
          if (type === Modes.SAFE) {
            if (this._context.task.product.variants && this._context.task.product.variants.length) {
              this._emitTaskEvent({ message: 'Adding to cart', proxy: rawProxy });
              return States.ADD_TO_CART;
            }
            this._emitTaskEvent({ message: 'Waiting for product', proxy: rawProxy });
            return States.WAIT_FOR_PRODUCT;
          }

          this._emitTaskEvent({ message: 'Waiting for captcha', proxy: rawProxy });
          return States.CAPTCHA;
        }

        if (/login/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Invalid account', proxy: rawProxy });
          return States.ERROR;
        }

        if (/account/i.test(redirectUrl)) {
          this._needsLogin = false; // update global check for login

          if (type === Modes.SAFE && !this._captchaToken) {
            if (this._context.task.product.variants && this._context.task.product.variants.length) {
              this._emitTaskEvent({ message: 'Adding to cart', proxy: rawProxy });
              return States.ADD_TO_CART;
            }
            this._emitTaskEvent({ message: 'Waiting for product', proxy: rawProxy });
            return States.WAIT_FOR_PRODUCT;
          }

          // reset captcha token (do we need to do this? or can we use it twice...)
          // if (this.captchaToken) {
          //   this.captchaToken = '';
          // }

          this._emitTaskEvent({ message: 'Creating checkout', proxy: rawProxy });
          return States.CREATE_CHECKOUT;
        }
      }

      const message = status ? `Logging in - (${status})` : 'Logging in';
      this._emitTaskEvent({ message, rawProxy });
      return States.LOGIN;
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Login.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Logging in',
        nextState: States.LOGIN,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno ? `Logging in - (${err.status || err.errno})` : 'Logging in';

      this._emitTaskEvent({ message, rawProxy });
      return States.LOGIN;
    }
  }

  async _handlePaymentToken() {
    const {
      aborted,
      task: {
        profile: { payment, billing },
        store: { url },
      },
      proxy,
      rawProxy,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      let res = await this._fetch('https://elb.deposit.shopifycs.com/sessions', {
        method: 'OPTIONS',
        compress: true,
        agent: proxy,
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': 'content-type',
          'Access-Control-Request-Method': 'POST',
          DNT: 1,
          Connection: 'Keep-Alive',
          Origin: 'https://checkout.shopifycs.com',
          'Sec-Fetch-Mode': 'no-cors',
          Referer: `https://checkout.shopifycs.com/number?identifier=${
            this._checkoutToken
          }&location=${encodeURIComponent(
            `${url}/${this._storeId}/checkouts/${this._checkoutToken}?previous_step=shipping_method&step=payment_method`,
          )}`,
        },
      });

      if (!res.ok) {
        this._emitTaskEvent({ message: 'Creating payment session' });
        return States.PAYMENT_TOKEN;
      }

      res = await this._fetch('https://elb.deposit.shopifycs.com/sessions', {
        method: 'POST',
        compress: true,
        agent: proxy,
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': 'content-type',
          'Access-Control-Request-Method': 'POST',
          DNT: 1,
          Connection: 'Keep-Alive',
          Origin: 'https://checkout.shopifycs.com',
          'Sec-Fetch-Mode': 'no-cors',
          Referer: `https://checkout.shopifycs.com/number?identifier=${
            this._checkoutToken
          }&location=${encodeURIComponent(
            `${url}/${this._storeId}/checkouts/${this._checkoutToken}?previous_step=shipping_method&step=payment_method`,
          )}`,
        },
        body: JSON.stringify({
          credit_card: {
            number: payment.cardNumber,
            name: `${billing.firstName} ${billing.lastName}`,
            month: parseInt(payment.exp.slice(0, 2), 10),
            year: `20${parseInt(payment.exp.slice(3, 5), 10)}`,
            verification_value: payment.cvv,
          },
        }),
      });

      const { status } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Creating payment session',
          nextState: States.PAYMENT_TOKEN,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const { id } = await res.json();

      if (id) {
        this._logger.silly('Payment token: %s', id);
        this._paymentToken = id;
        return States.SUBMIT_PAYMENT;
      }

      return States.PAYMENT_TOKEN;
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Payment Token.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Creating payment session',
        nextState: States.PAYMENT_TOKEN,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Creating payment session - (${err.status || err.errno})`
          : 'Creating payment session';

      this._emitTaskEvent({ message, rawProxy });
      return States.PAYMENT_TOKEN;
    }
  }

  async _handleGatherData() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        store: { url },
        type,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(url, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        headers: {
          'User-Agent': userAgent,
        },
      });

      const { status } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Getting data',
          nextState: States.GATHER_DATA,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const body = await res.text();
      let match = body.match(/<meta\s*name="shopify-checkout-api-token"\s*content="(.*)">/);

      let accessToken;
      if (match && match.length) {
        [, accessToken] = match;
        this._context.task.store.apiKey = accessToken;
      }

      if (!accessToken) {
        // check the script location as well
        match = body.match(/"accessToken":(.*)","betas"/);

        if (!match || !match.length) {
          this._emitTaskEvent({ message: 'Invalid Shopify Store', rawProxy });
          return States.ERROR;
        }
        [, accessToken] = match;
        this._context.task.store.apiKey = accessToken;
      }
      if (type === Modes.SAFE) {
        if (!this._needsLogin) {
          if (this._context.task.product.variants && this._context.task.product.variants.length) {
            this._emitTaskEvent({
              message: 'Adding to cart',
              rawProxy,
              apiKey: this._context.task.store.apiKey || undefined,
            });
            return States.ADD_TO_CART;
          }
          this._emitTaskEvent({
            message: 'Waiting for product',
            rawProxy,
            apiKey: this._context.task.store.apiKey || undefined,
          });
          return States.WAIT_FOR_PRODUCT;
        }
        this._emitTaskEvent({
          message: 'Logging in',
          rawProxy,
          apiKey: this._context.task.store.apiKey || undefined,
        });
        return States.LOGIN;
      }
      if (!this._needsLogin) {
        this._emitTaskEvent({
          message: 'Creating checkout',
          rawProxy,
          apiKey: this._context.task.store.apiKey || undefined,
        });
        return States.CREATE_CHECKOUT;
      }
      this._emitTaskEvent({ message: 'Logging in', rawProxy });
      return States.LOGIN;
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Login.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Logging in',
        nextState: States.LOGIN,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno ? `Logging in - (${err.status || err.errno})` : 'Logging in';

      this._emitTaskEvent({ message, rawProxy });
      return States.LOGIN;
    }
  }

  async _handleGetCheckpoint() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        monitorDelay,
        store: { url, apiKey },
      },
    } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(this.checkpointUrl, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          referer: `${url}/cart`,
        },
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Going to checkpoint',
          nextState: States.GO_TO_CHECKPOINT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      this._logger.debug('Checkpoint redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Creating checkout' });
          return States.CREATE_CHECKOUT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
              redirect: 'manual',
              follow: 0,
              headers: {
                ...getHeaders({ url, apiKey }),
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this._storeId, , this._checkoutToken] = redirectUrl.split('/');
          this._emitTaskEvent({ message: 'Going to checkout', rawProxy });
          return States.GO_TO_CHECKOUT;
        }
      }

      const body = await res.text();

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
        this._logger.info('Checkpoint form value detected: { name: %j, value: %j }', name, value);

        if (name) {
          this._checkpointForm += `${name}=${value ? value.replace(/\s/g, '+') : ''}&`;
        }
      });

      // recaptcha sitekey parser...
      const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
      if (match && match.length) {
        [, this._context.task.store.sitekey] = match;
        this._logger.debug('PARSED SITEKEY!: %j', this._context.task.store.sitekey);
      }

      if (this._checkpointForm.endsWith('&')) {
        this._checkpointForm = this._checkpointForm.slice(0, -1);
      }

      this._emitTaskEvent({ message: 'Checkpoint captcha', rawProxy });
      return States.CAPTCHA;
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Going to checkpoint.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Going to checkpoint',
        nextState: States.GO_TO_CHECKPOINT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Going to checkpoint - (${err.status || err.errno})`
          : 'Going to checkpoint';

      this._emitTaskEvent({ message, rawProxy });
      return States.GO_TO_CHECKPOINT;
    }
  }

  async _handleSubmitCheckpoint() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        monitorDelay,
        store: { url, apiKey },
      },
    } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    this._emitTaskEvent({ message: 'Submitting checkpoint', rawProxy });

    if (this._captchaToken && !/g-recaptcha-response/i.test(this._checkpointForm)) {
      const parts = this._checkpointForm.split('&');
      if (parts && parts.length) {
        this._checkpointForm = '';
        // eslint-disable-next-line array-callback-return
        parts.forEach(part => {
          if (/authenticity_token/i.test(part)) {
            this._checkpointForm += `${part}&g-recaptcha-response=${this._captchaToken}&`;
          } else {
            this._checkpointForm += `${part}&`;
          }
        });
      }
    }

    if (this._checkpointForm.endsWith('&')) {
      this._checkpointForm = this._checkpointForm.slice(0, -1);
    }

    this._logger.debug('CHECKPOINT FORM: %j', this._checkpointForm);

    try {
      const res = await this._fetch(`/checkpoint`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: this._checkpointForm,
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Submitting checkpoint',
          nextState: States.SUBMIT_CHECKPOINT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      this._logger.debug('Checkpoint redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (/checkout/i.test(redirectUrl)) {
          this._backupCheckout = true;
          this._emitTaskEvent({ message: 'Creating checkout' });
          return States.CREATE_CHECKOUT;
        }

        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Creating checkout' });
          return States.CREATE_CHECKOUT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
              redirect: 'manual',
              follow: 0,
              headers: {
                ...getHeaders({ url, apiKey }),
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': userAgent,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/cart/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Creating checkout', rawProxy });
          return States.CREATE_CHECKOUT;
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this._storeId, , this._checkoutToken] = redirectUrl.split('/');
          this._emitTaskEvent({ message: 'Going to checkout', rawProxy });
          return States.GO_TO_CHECKOUT;
        }
      }

      const message = status ? `Submitting checkpoint - (${status})` : 'Submitting checkpoint';
      this._emitTaskEvent({ message, rawProxy });
      return States.SUBMIT_CHECKPOINT;
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Checkpoint.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Going to checkpoint',
        nextState: States.GO_TO_CHECKPOINT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Going to checkpoint - (${err.status || err.errno})`
          : 'Going to checkpoint';

      this._emitTaskEvent({ message, rawProxy });
      return States.GO_TO_CHECKPOINT;
    }
  }

  async _handleCreateCheckout() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        monitorDelay,
        store: { url, name, apiKey },
        type,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (/dsm sg|dsm jp|dsm uk/i.test(name) && (this._isRestocking || type === Modes.FAST)) {
      return this._handleCreateCheckoutWallets();
    }

    if ((!/dsm us/i.test(name) && type === Modes.FAST) || this._backupCheckout) {
      return this._handleBackupCreateCheckout();
    }

    if (!this._cartForm.includes('checkout')) {
      this._cartForm += `checkout=Check+out`;
    }

    try {
      const res = await this._fetch(`${url}/cart`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          'content-type': 'application/x-www-form-urlencoded',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        },
        body: this._cartForm,
      });

      this._cartForm = '';
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      this._logger.debug('Create checkout redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this.checkpointUrl = redirectUrl;
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Creating checkout' });
          return States.CREATE_CHECKOUT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this._storeId, , this._checkoutToken] = redirectUrl.split('/');
          this._emitTaskEvent({ message: 'Going to checkout', rawProxy });
          return States.GO_TO_CHECKOUT;
        }

        if (/cart/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Adding to cart', rawProxy });
          return States.ADD_TO_CART;
        }
      }

      const message = status ? `Creating checkout - (${status})` : 'Creating checkout';
      this._emitTaskEvent({ message, rawProxy });
      return States.CREATE_CHECKOUT;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Creating checkout - (${err.status || err.errno})`
          : 'Creating checkout';

      this._emitTaskEvent({ message, rawProxy });
      return States.CREATE_CHECKOUT;
    }
  }

  async _handleBackupCreateCheckout() {
    const {
      aborted,
      rawProxy,
      task: {
        store: { url, apiKey },
        monitorDelay,
        type,
      },
      proxy,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/checkout`, {
        method: 'POST',
        compress: true,
        agent: proxy,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      this._logger.debug('Create checkout redirect url: %j', redirectUrl);
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/login/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Account needed!', rawProxy });
          return States.ERROR;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Creating checkout' });
          return States.CREATE_CHECKOUT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this._storeId, , this._checkoutToken] = redirectUrl.split('/');

          if (type === Modes.SAFE) {
            this._emitTaskEvent({ message: 'Going to checkout', rawProxy });
            return States.GO_TO_CHECKOUT;
          }
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.SUBMIT_CUSTOMER;
        }
      }

      const message = status ? `Creating checkout - (${status})` : 'Creating checkout';
      this._emitTaskEvent({ message, rawProxy });
      return States.CREATE_CHECKOUT;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Creating checkout - (${err.status || err.errno})`
          : 'Creating checkout';

      this._emitTaskEvent({ message, rawProxy });
      return States.CREATE_CHECKOUT;
    }
  }

  async _handleCreateCheckoutWallets() {
    const {
      aborted,
      rawProxy,
      task: {
        store: { url, apiKey },
        monitorDelay,
      },
      proxy,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/wallets/checkouts`, {
        method: 'POST',
        compress: true,
        agent: proxy,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      this._logger.debug('Create checkout redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Creating checkout' });
          return States.CREATE_CHECKOUT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }
      }

      const body = await res.json();

      if (body && body.error) {
        if (/channel is locked/i.test(body.error)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Creating checkout' });
          return States.CREATE_CHECKOUT;
        }
        this._emitTaskEvent({ message: 'Invalid checkout!', rawProxy });
        return States.CREATE_CHECKOUT;
      }

      if (body && body.checkout) {
        const { web_url: checkoutUrl } = body.checkout;
        if (/checkouts/i.test(checkoutUrl)) {
          [, , , this._storeId, , this._checkoutToken] = checkoutUrl.split('/');
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.SUBMIT_CUSTOMER;
        }
      }

      const message = status ? `Creating checkout - (${status})` : 'Creating checkout';
      this._emitTaskEvent({ message, rawProxy });
      return States.CREATE_CHECKOUT;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Creating checkout - (${err.status || err.errno})`
          : 'Creating checkout';

      this._emitTaskEvent({ message, rawProxy });
      return States.CREATE_CHECKOUT;
    }
  }

  async _handlePollQueue() {
    const {
      aborted,
      rawProxy,
      task: {
        type,
        store: { url, apiKey },
      },
      proxy,
      timers: { monitor },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let message;
    let nextState;
    try {
      const res = await this._fetch(`${url}/checkout/poll?js_poll=1`, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          'User-Agent': userAgent,
          Connection: 'Keep-Alive',
          referer: this.queueReferer,
          connection: 'close',
          accept: '*/*',
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          host: `${url.split('/')[2]}`,
        },
      });

      const { status, headers } = res;

      this._logger.debug('Checkout: poll response %d', status);
      nextState = stateForError(
        { status },
        {
          message: 'Polling queue',
          nextState: States.QUEUE,
        },
      );

      if (nextState) {
        if (nextState.message) {
          this._emitTaskEvent({ message: nextState.message, rawProxy });
        }
        return nextState.nextState;
      }

      if (status === 400) {
        this._emitTaskEvent({ message: 'Invalid checkout!', rawProxy });
        return States.CREATE_CHECKOUT;
      }

      const body = await res.text();

      let redirectUrl = headers.get('location');
      this._logger.debug('CHECKOUT: Queue response: %j \nBody: %j', status, body);
      if (status === 302) {
        if (!redirectUrl || /throttle/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Not through queue (${status})`, rawProxy });
          return States.QUEUE;
        }

        if (/_ctd/i.test(redirectUrl)) {
          try {
            const response = await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
              redirect: 'manual',
              headers: {
                ...getHeaders({ url, apiKey }),
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': userAgent,
                Connection: 'Keep-Alive',
              },
            });

            const respBody = await response.text();

            this._logger.debug('NEW QUEUE BODY: %j', respBody);

            const [, checkoutUrl] = respBody.match(/href="(.*)"/);

            if (checkoutUrl && /checkouts/i.test(checkoutUrl)) {
              const [checkoutNoQs] = checkoutUrl.split('?');
              [, , , this._storeId, , this._checkoutToken] = checkoutNoQs.split('/');
              if (type === Modes.FAST) {
                monitor.start();
              }

              ({ message, nextState } = StateMap[this._prevState](
                type,
                this._context.task,
                this._selectedShippingRate,
              ));

              this._emitTaskEvent({ message, rawProxy });
              return nextState;
            }
          } catch (e) {
            this._logger.error('Error fetching cookied checkout: %j', e);
          }
        }
        this._logger.silly('CHECKOUT: Polling queue redirect url %s...', redirectUrl);
      } else if (status === 200) {
        if (isEmpty(body) || (!isEmpty(body) && body.length < 2)) {
          let ctd;
          if (!this._ctd) {
            ctd = await this.getCookie(this._context.jar, '_ctd');
          } else {
            ctd = this._ctd;
          }

          try {
            const response = await this._fetch(`${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`, {
              method: 'GET',
              compress: true,
              agent: proxy,
              redirect: 'manual',
              follow: 0,
              headers: {
                ...getHeaders({ url, apiKey }),
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': userAgent,
                Connection: 'Keep-Alive',
              },
            });

            const respBody = await response.text();
            this._logger.debug('QUEUE: 200 RESPONSE BODY: %j', respBody);

            const match = respBody.match(/href="(.*)"/);

            if (match && match.length) {
              const [, checkoutUrl] = match;
              this._logger.debug('QUEUE: checkoutUrl: %j', checkoutUrl);
              if (checkoutUrl && /checkouts/i.test(checkoutUrl)) {
                const [checkoutNoQs] = checkoutUrl.split('?');
                [, , , this._storeId, , this._checkoutToken] = checkoutNoQs.split('/');
                if (type === Modes.FAST) {
                  monitor.start();
                }
                ({ message, nextState } = StateMap[this._prevState](
                  type,
                  this._context.task,
                  this._selectedShippingRate,
                ));

                this._emitTaskEvent({ message, rawProxy });
                return nextState;
              }
            }
          } catch (error) {
            // fail silently...
          }
        }
        const $ = cheerio.load(body, { xmlMode: false, normalizeWhitespace: true });
        const [checkoutUrl] = $('input[name="checkout_url"]');

        if (checkoutUrl && /checkouts/i.test(checkoutUrl)) {
          [redirectUrl] = checkoutUrl.split('?');
        }
      }
      this._logger.debug('QUEUE: RedirectUrl at end of fn body: %j', redirectUrl);

      if (redirectUrl && /checkpoint/i.test(redirectUrl)) {
        this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
        this.checkpointUrl = redirectUrl;
        return States.GO_TO_CHECKPOINT;
      }

      if (redirectUrl && /checkouts/.test(redirectUrl)) {
        const [redirectNoQs] = redirectUrl.split('?');
        [, , , this._storeId, , this._checkoutToken] = redirectNoQs.split('/');

        if (type === Modes.FAST) {
          monitor.start();
        }
        ({ message, nextState } = StateMap[this._prevState](
          type,
          this._context.task,
          this._selectedShippingRate,
        ));

        this._emitTaskEvent({ message, rawProxy });
        return nextState;
      }
      this._logger.silly('CHECKOUT: Not passed queue, delaying 5000ms');
      message = status ? `Not through queue! (${status})` : 'Not through queue!';
      this._emitTaskEvent({ message, rawProxy });
      this._delayer = waitForDelay(5000, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Polling queue' });
      return States.QUEUE;
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Poll Queue.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );
      nextState = stateForError(err, {
        message: 'Polling queue',
        nextState: States.QUEUE,
      });

      if (nextState) {
        if (nextState.message) {
          this._emitTaskEvent({ message: nextState.message, rawProxy });
        }
        return nextState.nextState;
      }

      message =
        err.status || err.errno ? `Polling queue - (${err.status || err.errno})` : 'Polling queue';
      this._emitTaskEvent({ message, rawProxy });

      return States.QUEUE;
    }
  }

  async _handleWaitForProduct() {
    const { aborted } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._context.task.product.variants) {
      return States.ADD_TO_CART;
    }

    if (this._deregisterOverride) {
      return States.SWAP;
    }

    this._delayer = waitForDelay(500, this._aborter.signal);
    await this._delayer;

    return States.WAIT_FOR_PRODUCT;
  }

  async _handleAddToCart() {
    const {
      aborted,
      rawProxy,
      task: {
        store: { name, url },
        product: { variants, hash, restockUrl, randomInStock },
        size,
        type,
        monitorDelay,
      },
      proxy,
      parseType,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._isRestocking || type === Modes.FAST) {
      return this._handleBackupAddToCart();
    }

    let variant;
    if (parseType !== ParseType.Variant) {
      variant = await pickVariant(variants, size, url, this._logger, randomInStock);
    } else {
      [variant] = variants;
    }

    if (!variant) {
      this._emitTaskEvent({ message: 'No size matched!', rawProxy });
      return States.ERROR;
    }

    const { option, id } = variant;

    this._context.task.product.size = option;

    try {
      const res = await this._fetch('/cart/add.js', {
        method: 'POST',
        compress: true,
        agent: proxy,
        headers: {
          origin: url,
          host: `${url.split('/')[2]}`,
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent': userAgent,
          accept: /dsm|funko/i.test(name) ? 'application/json,text/javascript,*/*;q=0.01' : '*/*',
          referer: restockUrl,
          'Content-Type': /dsm|funko/i.test(name)
            ? 'application/x-www-form-urlencoded; charset=UTF-8'
            : 'application/json',
        },
        body: addToCart(id, name, hash),
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('FRONTEND CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy, size });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          this._emitTaskEvent({
            message: `Out of stock! Delaying ${monitorDelay}ms`,
            rawProxy,
            size,
          });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Adding to cart', rawProxy, size });
          return States.ADD_TO_CART;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Adding to cart', rawProxy, size });
          return States.ADD_TO_CART;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy, size });
          return States.QUEUE;
        }
      }

      const body = await res.text();

      if (/cannot find variant/i.test(body)) {
        this._emitTaskEvent({
          message: `Variant not live, delaying ${monitorDelay}ms`,
          rawProxy,
          size,
        });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Adding to cart', size });
        return States.ADD_TO_CART;
      }

      if (this._checkoutUrl) {
        this._emitTaskEvent({ message: 'Going to checkout', size });
        return States.GO_TO_CHECKOUT;
      }

      this._emitTaskEvent({ message: 'Going to cart', rawProxy, size });
      return States.GO_TO_CART;
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Add to Cart.\n\n %j %j',
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Adding to cart - (${err.status || err.errno})`
          : 'Adding to cart';

      this._emitTaskEvent({ message, rawProxy });
      return States.ADD_TO_CART;
    }
  }

  async _handleClearCart() {
    const {
      aborted,
      rawProxy,
      task: {
        store: { url, apiKey },
      },
      proxy,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/cart/clear.js`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
        },
      });

      const body = await res.json();

      if (body && body.items && body.items.length) {
        this._emitTaskEvent({ message: 'Failed to clear items, retrying...', rawProxy });
        return States.CLEAR_CART;
      }

      // extra padding to make sure that the variants are reset...
      delete this._context.task.product.variants;
      delete this._context.task.product.variant;
      delete this._context.task.product.size;

      this._context.task.type = Modes.SAFE;

      this._emitTaskEvent({ message: 'Cart cleared!', rawProxy });
      return States.WAIT_FOR_PRODUCT;
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Add to Cart.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Clearing cart',
        nextState: States.CLEAR_CART,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno ? `Clearing cart - (${err.status || err.errno})` : 'Clearing cart';

      this._emitTaskEvent({ message, rawProxy });
      return States.CLEAR_CART;
    }
  }

  async _handleBackupAddToCart() {
    const {
      aborted,
      rawProxy,
      task: {
        store: { url, name, apiKey },
        product: { variants, hash, randomInStock },
        size,
        monitorDelay,
      },
      proxy,
      parseType,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let variant;
    if (parseType !== ParseType.Variant) {
      variant = await pickVariant(variants, size, url, this._logger, randomInStock);
    } else {
      [variant] = variants;
    }

    if (!variant) {
      this._emitTaskEvent({ message: 'No size matched!', rawProxy });
      return States.ERROR;
    }

    const { option, id } = variant;

    this._context.task.product.size = option;

    let opts = {};
    const base = {
      checkout: {
        line_items: [
          {
            variant_id: id,
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
      const res = await this._fetch(`/wallets/checkouts/${this._checkoutToken}.json`, {
        method: 'PATCH',
        compress: true,
        agent: proxy,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('API CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      // check redirects
      if (redirectUrl) {
        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          const message = this._isRestocking ? 'Checking stock' : 'Adding to cart';
          this._emitTaskEvent({ message, rawProxy });
          return States.ADD_TO_CART;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }
      }

      const body = await res.json();
      if (body.errors && body.errors.line_items) {
        const error = body.errors.line_items[0];
        this._logger.silly('Error adding to cart: %j', error);
        if (error && error.quantity) {
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          const message = this._isRestocking ? 'Checking stock' : 'Adding to cart';
          this._emitTaskEvent({ message, rawProxy });
          return States.ADD_TO_CART;
        }
        if (error && error.variant_id && error.variant_id.length) {
          this._emitTaskEvent({
            message: `Variant not live! Delaying ${monitorDelay}ms`,
            rawProxy,
          });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          const message = this._isRestocking ? 'Checking stock' : 'Adding to cart';
          this._emitTaskEvent({ message, rawProxy });
          return States.ADD_TO_CART;
        }

        const message = status ? `Adding to cart – (${status})` : 'Adding to cart';
        this._emitTaskEvent({ message, rawProxy });
        return States.ADD_TO_CART;
      }

      if (body.checkout && body.checkout.line_items && body.checkout.line_items.length) {
        const { total_price: totalPrice } = body.checkout;

        this._context.task.product.name = body.checkout.line_items[0].title;
        this._context.task.product.image = body.checkout.line_items[0].image_url.startsWith('http')
          ? body.checkout.line_items[0].image_url
          : `http:${body.checkout.line_items[0].image_url}`;

        this._prices.cart = parseFloat(totalPrice).toFixed(2);

        if (this._isRestocking) {
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.PAYMENT_TOKEN;
        }

        if (this._selectedShippingRate.id) {
          this._logger.silly('API CHECKOUT: Shipping total: %s', this._prices.shipping);
          this._prices.total = (
            parseFloat(this._prices.cart) + parseFloat(this._selectedShippingRate.price)
          ).toFixed(2);
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.PAYMENT_TOKEN;
        }
        this._emitTaskEvent({ message: 'Going to checkout', rawProxy });
        return States.GO_TO_CHECKOUT;
      }
      const message = status ? `Adding to cart – (${status})` : 'Adding to cart';
      this._emitTaskEvent({ message, rawProxy });
      return States.ADD_TO_CART;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Adding to cart - (${err.status || err.errno})`
          : 'Adding to cart';

      this._emitTaskEvent({ message, rawProxy });
      return States.ADD_TO_CART;
    }
  }

  async _handleGoToCart() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        monitorDelay,
        store: { url, apiKey },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/cart`, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
        },
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Going to cart',
          nextState: States.GO_TO_CART,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Going to cart' });
          return States.GO_TO_CART;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }
      }

      const body = await res.text();

      const $ = cheerio.load(body, {
        normalizeWhitespace: true,
        xmlMode: false,
      });

      $('form[action="/cart"], input, select, textarea, button').each((_, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value') || '';

        this._logger.info('Cart form value detected: { name: %j, value: %j }', name, value);
        // Blacklisted values/names
        if (
          name &&
          !/q|g|gender|\$fields|email|subscribe|updates\[.*:.*]/i.test(name) &&
          !/update cart|Update|{{itemQty}}/i.test(value)
        ) {
          this._cartForm += `${name}=${value ? value.replace(/\s/g, '+') : ''}&`;
        }
      });

      if (this._cartForm.endsWith('&')) {
        this._cartForm = this._cartForm.slice(0, -1);
      }

      this._logger.info('Cart form parsed: %j', this._cartForm);

      if (this._needsLogin) {
        this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
        // we can assume that if we're here and need a login, it's due to us hitting `/challenge`
        return States.CAPTCHA;
      }
      this._emitTaskEvent({ message: 'Creating checkout', rawProxy });
      return States.CREATE_CHECKOUT;
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit customer .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Going to cart',
        nextState: States.GO_TO_CART,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno ? `Going to cart - (${err.status || err.errno})` : 'Going to cart';

      this._emitTaskEvent({ message, rawProxy });
      return States.GO_TO_CART;
    }
  }

  async _handleRequestCaptcha() {
    const {
      aborted,
      task: { type },
      rawProxy,
    } = this._context;
    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      if (this._captchaTokenRequest) {
        // cancel the request if it was previously started
        this._captchaTokenRequest.cancel('aborted');
      }
      return States.ABORT;
    }

    // start request if it hasn't started already
    if (!this._captchaTokenRequest) {
      this._captchaTokenRequest = await this.getCaptcha();
    }

    // Check the status of the request
    switch (this._captchaTokenRequest.status) {
      case 'pending': {
        // waiting for token, sleep for delay and then return same state to check again
        await new Promise(resolve => setTimeout(resolve, 500));
        return States.CAPTCHA;
      }
      case 'fulfilled': {
        // token was returned, store it and remove the request
        ({ value: this._captchaToken } = this._captchaTokenRequest);
        this._captchaTokenRequest = null;
        // We have the token, so suspend harvesting for now
        this.suspendHarvestCaptcha();

        if (this._prevState === States.GO_TO_SHIPPING) {
          if (type === Modes.FAST) {
            this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
            return States.PAYMENT_TOKEN;
          }
          this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
          return States.SUBMIT_SHIPPING;
        }

        // only happens in safe mode
        if (this._prevState === States.GO_TO_CART) {
          this._emitTaskEvent({ message: 'Logging in', rawProxy });
          return States.LOGIN;
        }

        if (this._prevState === States.GO_TO_CHECKPOINT) {
          this._emitTaskEvent({ message: 'Submitting checkpoint', rawProxy });
          return States.SUBMIT_CHECKPOINT;
        }

        if (this._prevState === States.GO_TO_CHECKOUT) {
          if (type === Modes.FAST) {
            if (this._selectedShippingRate.id) {
              this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
              return States.PAYMENT_TOKEN;
            }
            this._emitTaskEvent({ message: 'Fetching rates', rawProxy });
            return States.GO_TO_SHIPPING;
          }
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.SUBMIT_CUSTOMER;
        }

        if (this._prevState === States.SUBMIT_PAYMENT) {
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }

        // return to the previous state
        return this._prevState;
      }
      case 'cancelled':
      case 'destroyed': {
        this._logger.silly(
          'Harvest Captcha status: %s, stopping...',
          this._captchaTokenRequest.status,
        );
        // clear out the status so we get a generic "errored out task event"
        this._context.status = null;
        return States.ERROR;
      }
      default: {
        this._logger.silly(
          'Unknown Harvest Captcha status! %s, stopping...',
          this._captchaTokenRequest.status,
        );
        // clear out the status so we get a generic "errored out task event"
        this._context.status = null;
        return States.ERROR;
      }
    }
  }

  async _handleGetCheckout() {
    const {
      aborted,
      rawProxy,
      task: {
        store: { url, name, apiKey },
        monitorDelay,
        forceCaptcha,
        restockMode,
        type,
      },
      proxy,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (type === Modes.FAST) {
      return this._handleBackupGetCheckout();
    }

    try {
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'GET',
        compress: true,
        agent: proxy,
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
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Going to checkout',
          nextState: States.GO_TO_CHECKOUT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const body = await res.text();
      const $ = cheerio.load(body, {
        xmlMode: false,
        normalizeWhitespace: true,
      });

      // grab the checkoutKey if it's exists and we don't have it yet..
      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          this._logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
        // TODO: toggle to send the checkout link to discord
        this._checkoutUrl = checkoutUrl;
        this._emitTaskEvent({ message: `Created checkout: ${checkoutUrl}`, checkoutUrl, rawProxy });
      }

      if (this._context.task.type === Modes.CART) {
        this._emitTaskEvent({ message: 'Clearing cart!' });
        return States.CLEAR_CART;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly(`CHECKOUT: Get checkout redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/login/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Account needed!', rawProxy });
          return States.DONE;
        }

        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Going to checkout', rawProxy });
          return States.GO_TO_CHECKOUT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          if (/dsm sg|dsm uk|dsm jp/i.test(name) && restockMode) {
            this._emitTaskEvent({ message: `Creating checkout`, rawProxy });
            this._isRestocking = true;
            return States.CREATE_CHECKOUT;
          }
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Going to checkout', rawProxy });
          return States.GO_TO_CHECKOUT;
        }

        if (/cart/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Cart empty', rawProxy });
          return States.ADD_TO_CART;
        }
      }

      if (/stock_problems/i.test(body)) {
        this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Going to checkout', rawProxy });
        return States.GO_TO_CHECKOUT;
      }

      // form parser...
      this._formValues = await parseForm(
        $,
        States.GO_TO_CHECKOUT,
        this._checkoutToken,
        this._context.task.profile,
        'form.edit_checkout',
        'input, select, textarea, button',
      );

      // recaptcha sitekey parser...
      const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
      if (match && match.length) {
        [, this._context.task.store.sitekey] = match;
        this._logger.debug('PARSED SITEKEY!: %j', this._context.task.store.sitekey);
      }

      if ((/recaptcha/i.test(body) || forceCaptcha) && !this._captchaToken) {
        this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
        return States.CAPTCHA;
      }

      this._emitTaskEvent({ message: 'Submitting information', rawProxy, checkoutUrl });
      return States.SUBMIT_CUSTOMER;
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit customer .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Going to checkout',
        nextState: States.GO_TO_CHECKOUT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Going to checkout - (${err.status || err.errno})`
          : 'Going to checkout';

      this._emitTaskEvent({ message, rawProxy });
      return States.GO_TO_CHECKOUT;
    }
  }

  async _handleBackupGetCheckout() {
    const {
      aborted,
      rawProxy,
      task: {
        store: { url, apiKey },
        monitorDelay,
        forceCaptcha,
      },
      proxy,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Going to checkout',
          nextState: States.GO_TO_CHECKOUT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('CHECKOUT: Get checkout redirect url: %s', redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/login/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Account needed!', rawProxy });
          return States.DONE;
        }

        if (/cart/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Going to checkout', rawProxy });
          return States.GO_TO_CHECKOUT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Going to checkout', rawProxy });
          return States.GO_TO_CHECKOUT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }
      }

      const body = await res.text();

      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          this._logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
        // TODO: toggle to send the checkout link to discord
        this._checkoutUrl = checkoutUrl;
        this._emitTaskEvent({ message: `Created checkout: ${checkoutUrl}`, checkoutUrl, rawProxy });
      }

      // recaptcha sitekey parser...
      const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
      if (match && match.length) {
        [, this._context.task.store.sitekey] = match;
        this._logger.debug('PARSED SITEKEY!: %j', this._context.task.store.sitekey);
      }

      if (this._selectedShippingRate.id) {
        if ((/recaptcha/i.test(body) || forceCaptcha) && !this._captchaToken) {
          this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
          return States.CAPTCHA;
        }
        this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
        return States.SUBMIT_PAYMENT;
      }

      this._emitTaskEvent({ message: 'Fetching rates', rawProxy });
      return States.GO_TO_SHIPPING;
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Ping Checkout.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Going to checkout',
        nextState: States.GO_TO_CHECKOUT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Going to checkout - (${err.status || err.errno})`
          : 'Going to checkout';

      this._emitTaskEvent({ message, rawProxy });
      return States.GO_TO_CHECKOUT;
    }
  }

  async _handleSubmitCustomer() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        monitorDelay,
        store: { url, apiKey },
        type,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._isRestocking || type === Modes.FAST) {
      return this._handleBackupSubmitCustomer();
    }

    if (this._captchaToken && !/g-recaptcha-response/i.test(this._formValues)) {
      const parts = this._formValues.split('button=');
      if (parts && parts.length) {
        this._formValues = '';
        parts.forEach((part, i) => {
          if (i === 0) {
            this._formValues += `${part}g-recaptcha-response=${this._captchaToken}`;
          } else {
            this._formValues += part;
          }
        });
      }
    }

    try {
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'content-type': 'application/x-www-form-urlencoded',
          'Upgrade-Insecure-Requests': '1',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        },
        body: this._formValues,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      // if we followed a redirect at some point...
      const redirectUrl = headers.get('location');
      this._logger.error('SUBMIT CUSTOMER REDIRECT URL: %s', redirectUrl);
      if (redirectUrl) {
        this._redirectUrl = redirectUrl;
        if (/stock_problems/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Out of stock, delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.GO_TO_CHECKOUT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.SUBMIT_CUSTOMER;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/step=stock_problems/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Out of stock, delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.GO_TO_CHECKOUT;
        }

        if (/step=shipping_method/i.test(redirectUrl)) {
          this._captchaToken = ''; // reset captcha token
          this._emitTaskEvent({ message: 'Fetching rates', rawProxy });
          return States.GO_TO_SHIPPING;
        }

        if (/step=contact_information/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.GO_TO_CHECKOUT;
        }

        if (/step=payment_method/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.GO_TO_PAYMENT;
        }
      }

      this._emitTaskEvent({ message: 'Submitting information', rawProxy });
      return States.GO_TO_CHECKOUT;
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit customer .\n\n %j %j',
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting information - (${err.status || err.errno})`
          : 'Submitting information';

      this._emitTaskEvent({ message, rawProxy });
      return States.SUBMIT_CUSTOMER;
    }
  }

  async _handleBackupSubmitCustomer() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        profile: { shipping, billing, payment, billingMatchesShipping },
        store: { url, apiKey },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`/wallets/checkouts/${this._checkoutToken}.json`, {
        method: 'PATCH',
        compress: true,
        agent: proxy,
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
          this._emitTaskEvent({ message, rawProxy });
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
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
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
        this._emitTaskEvent({ message, rawProxy });
        return States.SUBMIT_CUSTOMER;
      }

      if (this._isRestocking) {
        if (!this._selectedShippingRate.id) {
          this._emitTaskEvent({ message: 'Fetching rates', rawProxy });
          return States.GO_TO_SHIPPING;
        }
        this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
        return States.SUBMIT_SHIPPING;
      }

      if (this._context.task.product.variants) {
        this._emitTaskEvent({ message: 'Adding to cart', rawProxy });
        return States.ADD_TO_CART;
      }
      this._emitTaskEvent({ message: 'Waiting for product', rawProxy });
      return States.WAIT_FOR_PRODUCT;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting information - (${err.status || err.errno})`
          : 'Submitting information';

      this._emitTaskEvent({ message, rawProxy });
      return States.SUBMIT_CUSTOMER;
    }
  }

  async _handleGetShipping() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        store: { url, apiKey },
        monitorDelay,
        forceCaptcha,
        type,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._isRestocking || type === Modes.FAST) {
      return this._handleBackupGetShipping();
    }

    try {
      const res = await this._fetch(
        this._redirectUrl || `/${this._storeId}/checkouts/${this._checkoutToken}`,
        {
          method: 'GET',
          compress: true,
          agent: proxy,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const body = await res.text();
      const $ = cheerio.load(body, {
        xmlMode: false,
        normalizeWhitespace: true,
      });

      // grab the checkoutKey if it's exists and we don't have it yet..
      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          this._logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
        // TODO: toggle to send the checkout link to discord
        this._checkoutUrl = checkoutUrl;
        this._emitTaskEvent({ message: `Created checkout: ${checkoutUrl}`, checkoutUrl, rawProxy });
      }

      const redirectUrl = headers.get('location');
      this._logger.silly(`CHECKOUT: Get shipping redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
          return States.GO_TO_SHIPPING;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          // TODO: restock mode
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
          return States.GO_TO_SHIPPING;
        }

        if (/cart/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Cart empty', rawProxy });
          return States.ADD_TO_CART;
        }
      }

      if (/stock_problems/i.test(body)) {
        // TODO: restock mode
        this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
        return States.GO_TO_SHIPPING;
      }

      if (/Getting available shipping rates/i.test(body)) {
        this._emitTaskEvent({ message: 'Polling rates', rawProxy });
        this._delayer = waitForDelay(1000, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
        return States.GO_TO_SHIPPING;
      }

      // form parser...
      this._formValues = await parseForm(
        $,
        States.GO_TO_SHIPPING,
        this._checkoutToken,
        this._context.task.profile,
        'form.edit_checkout',
        'input, select, textarea, button',
      );

      // recaptcha sitekey parser...
      const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
      if (match && match.length) {
        [, this._context.task.store.sitekey] = match;
        this._logger.debug('PARSED SITEKEY!: %j', this._context.task.store.sitekey);
      }

      if ((/recaptcha/i.test(body) || forceCaptcha) && !this._captchaToken) {
        this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
        return States.CAPTCHA;
      }

      this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
      return States.SUBMIT_SHIPPING;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Fetching rates - (${err.status || err.errno})`
          : 'Fetching rates';

      this._emitTaskEvent({ message, rawProxy });
      return States.GO_TO_SHIPPING;
    }
  }

  async _handleBackupGetShipping() {
    const {
      aborted,
      proxy,
      rawProxy,
      task: {
        store: { url, apiKey },
        forceCaptcha,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(
        `/wallets/checkouts/${this._checkoutToken}/shipping_rates.json`,
        {
          method: 'GET',
          compress: true,
          agent: proxy,
          headers: getHeaders({ url, apiKey }),
        },
      );

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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      if (status === 422) {
        this._emitTaskEvent({ message: 'Country not supported', rawProxy });
        return States.ERROR;
      }

      const body = await res.json();
      if (body && body.errors) {
        this._logger.silly('CHECKOUT: Error getting shipping rates: %j', body.errors);
        const { checkout } = body.errors;
        if (checkout) {
          const errorMessage = JSON.stringify(checkout);
          if (errorMessage.indexOf('does_not_require_shipping') > -1) {
            this._logger.silly('API CHECKOUT: Cart empty, retrying add to cart');

            if (this._isRestocking) {
              this._emitTaskEvent({ message: 'Adding to cart', rawProxy });
              return States.ADD_TO_CART;
            }

            if (forceCaptcha && !this._captchaToken) {
              this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
              return States.CAPTCHA;
            }
            this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
            return States.PAYMENT_TOKEN;
          }

          if (errorMessage.indexOf("can't be blank") > -1) {
            this._emitTaskEvent({ message: 'Submitting information', rawProxy });
            return States.SUBMIT_CUSTOMER;
          }
        }
        this._emitTaskEvent({ message: 'Polling rates', rawProxy });
        this._delayer = waitForDelay(1000, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Fetching rates', rawProxy });
        return States.GO_TO_SHIPPING;
      }

      if (body && body.shipping_rates && body.shipping_rates.length > 0) {
        const { shipping_rates: shippingRates } = body;
        shippingRates.forEach(rate => {
          this._shippingMethods.push(rate);
        });

        const cheapest = min(this._shippingMethods, rate => rate.price);
        // Store cheapest shipping rate
        const { id, title } = cheapest;
        this._selectedShippingRate = { id, name: title };
        this._logger.silly('API CHECKOUT: Using shipping method: %s', title);

        // set shipping price for cart
        this._prices.shipping = parseFloat(cheapest.price).toFixed(2);
        this._prices.total = (
          parseFloat(this._prices.cart) + parseFloat(this._prices.shipping)
        ).toFixed(2);
        this._logger.silly('API CHECKOUT: Shipping total: %s', this._prices.shipping);
        if (forceCaptcha && !this._captchaToken) {
          this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
          return States.CAPTCHA;
        }
        this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
        return States.PAYMENT_TOKEN;
      }
      this._emitTaskEvent({ message: 'Polling rates', rawProxy });
      this._delayer = waitForDelay(1000, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Fetching rates', rawProxy });
      return States.GO_TO_SHIPPING;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Fetching rates - (${err.status || err.errno})`
          : 'Fetching rates';

      this._emitTaskEvent({ message, rawProxy });
      return States.GO_TO_SHIPPING;
    }
  }

  async _handleSubmitShipping() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        monitorDelay,
        store: { url, apiKey },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
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
        body: this._formValues,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      // if we followed a redirect at some point...
      const redirectUrl = headers.get('location');
      this._logger.error('SUBMIT SHIPPING REDIRECT URL: %s', redirectUrl);
      if (redirectUrl) {
        this._redirectUrl = redirectUrl;
        if (/processing/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Processing payment', rawProxy });
          return States.PROCESS_PAYMENT;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
          return States.SUBMIT_SHIPPING;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
          return States.SUBMIT_SHIPPING;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/step=stock_problems/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Out of stock, delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.GO_TO_PAYMENT;
        }

        if (/step=payment_method/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.GO_TO_PAYMENT;
        }

        if (/step=shipping_method/i.test(redirectUrl)) {
          this._captchaToken = ''; // reset captcha token
          this._emitTaskEvent({ message: 'Fetching rates', rawProxy });
          return States.GO_TO_SHIPPING;
        }

        if (/step=contact_information/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.GO_TO_CHECKOUT;
        }
      }

      this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
      return States.GO_TO_SHIPPING;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting shipping - (${err.status || err.errno})`
          : 'Submitting shipping';

      this._emitTaskEvent({ message, rawProxy });
      return States.SUBMIT_SHIPPING;
    }
  }

  async _handleGetPayment() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        monitorDelay,
        store: { url, apiKey },
        forceCaptcha,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(
        this._redirectUrl || `/${this._storeId}/checkouts/${this._checkoutToken}`,
        {
          method: 'GET',
          compress: true,
          agent: proxy,
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
          this._emitTaskEvent({ message, rawProxy });
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
      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          this._logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
        // TODO: toggle to send the checkout link to discord
        this._checkoutUrl = checkoutUrl;
        this._emitTaskEvent({ message: `Created checkout: ${checkoutUrl}`, checkoutUrl, rawProxy });
      }

      const redirectUrl = headers.get('location');
      this._logger.silly(`CHECKOUT: Get payment redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        this._redirectUrl = redirectUrl;
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.GO_TO_PAYMENT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          // TODO: restock mode
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.GO_TO_PAYMENT;
        }

        if (/cart/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Cart empty', rawProxy });
          return States.ADD_TO_CART;
        }
      }

      if (/calculating taxes/i.test(body) || /polling/i.test(body)) {
        this._emitTaskEvent({ message: 'Calculating taxes', rawProxy });
        this._delayer = waitForDelay(1000, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
        return States.GO_TO_PAYMENT;
      }

      // form parser...
      this._formValues = await parseForm(
        $,
        States.GO_TO_PAYMENT,
        this._checkoutToken,
        this._context.task.profile,
        'form.edit_checkout',
        'input, select, textarea, button',
      );

      // recaptcha sitekey parser...
      const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
      if (match && match.length) {
        [, this._context.task.store.sitekey] = match;
        this._logger.debug('PARSED SITEKEY!: %j', this._context.task.store.sitekey);
      }

      if ((/recaptcha/i.test(body) || forceCaptcha) && !this._captchaToken) {
        this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
        return States.CAPTCHA;
      }

      if (!this._paymentToken && priceRecap !== '0') {
        this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
        return States.PAYMENT_TOKEN;
      }

      this._isFreeCheckout = true;
      this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
      return States.SUBMIT_PAYMENT;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting payment - (${err.status || err.errno})`
          : 'Submitting payment';

      this._emitTaskEvent({ message, rawProxy });
      return States.GO_TO_PAYMENT;
    }
  }

  async _handleSubmitPayment() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        monitorDelay,
        store: { url, apiKey },
        type,
      },
    } = this._context;

    if (type === Modes.FAST) {
      return this._handleBackupSubmitPayment();
    }

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._isFreeCheckout) {
      const parts = this._formValues.split('&');

      if (parts && parts.length) {
        this._formValues = '';
        parts.forEach(part => {
          if (/authenticity_token/i.test(part)) {
            this._formValues += `_method=patch&${part}&previous_step=payment_method&step=&s=&checkout%5Bcredit_card%5D%5Bvault%5D=false&checkout%5Bpayment_gateway%5D=free&checkout%5Btotal_price%5D=0&complete=1&checkout%5Bclient_details%5D%5Bbrowser_width%5D=1721&checkout%5Bclient_details%5D%5Bbrowser_height%5D=927&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1&checkout%5Bclient_details%5D%5Bcolor_depth%5D=24&checkout%5Bclient_details%5D%5Bjava_enabled%5D=false&checkout%5Bclient_details%5D%5Bbrowser_tz%5D=240`;
          }
        });
      }
    } else if (this._formValues.indexOf(this._paymentToken) === -1) {
      const parts = this._formValues.split('s=');
      if (parts && parts.length) {
        this._formValues = '';
        parts.forEach((part, i) => {
          if (i === 0) {
            this._formValues += `${part}s=${this._paymentToken}`;
          } else {
            this._formValues += part;
          }
        });
      }
    }

    try {
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
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
        body: this._formValues,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      this.needsPaymentToken = true;
      this._paymentToken = '';

      const body = await res.text();
      const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

      if (/stock_problems/i.test(body)) {
        this._emitTaskEvent({ message: `Out of stock, delaying ${monitorDelay}ms`, rawProxy });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
        return States.SUBMIT_PAYMENT;
      }

      if (/Your payment can’t be processed/i.test(body)) {
        this._emitTaskEvent({ message: 'Processing error (429)', rawProxy });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
        return States.SUBMIT_PAYMENT;
      }

      if (/captcha/i.test(body)) {
        this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
        return States.CAPTCHA;
      }

      // if we followed a redirect at some point...
      const redirectUrl = headers.get('location');
      if (redirectUrl) {
        this._redirectUrl = redirectUrl;
        if (/processing/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Processing payment', rawProxy });
          return States.PROCESS_PAYMENT;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Out of stock, delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.SUBMIT_PAYMENT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.SUBMIT_PAYMENT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }
      }

      // step tests
      if (match && match.length) {
        const [, step] = match;

        if (/processing/i.test(step)) {
          this._emitTaskEvent({ message: 'Processing payment', rawProxy });
          return States.PROCESS_PAYMENT;
        }

        if (/contact_information/i.test(step)) {
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.GO_TO_CHECKOUT;
        }

        if (/shipping_method/i.test(step)) {
          this._emitTaskEvent({ message: 'Fetching rates', rawProxy });
          return States.GO_TO_SHIPPING;
        }

        if (/payment_method/i.test(step)) {
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.GO_TO_PAYMENT;
        }

        if (/review/i.test(step)) {
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.GO_TO_PAYMENT;
        }
      }

      this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
      return States.GO_TO_PAYMENT;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting payment - (${err.status || err.errno})`
          : 'Submitting payment';

      return nextState || { message, nextState: States.SUBMIT_PAYMENT };
    }
  }

  async _handleBackupSubmitPayment() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        monitorDelay,
        store: { url, apiKey },
        forceCaptcha,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { id } = this._selectedShippingRate;

    let form = {
      complete: 1,
      s: this._paymentToken,
      checkout: {
        shipping_rate: {
          id,
        },
      },
    };

    if (this._captchaToken) {
      form = {
        ...form,
        'g-recaptcha-response': this._captchaToken,
      };
    }

    try {
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'PATCH',
        compress: true,
        agent: proxy,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('CHECKOUT: Post payment redirect url: %s', redirectUrl);

      const body = await res.text();

      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          this._logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
        // TODO: toggle to send the checkout link to discord
        this._checkoutUrl = checkoutUrl;
        this._emitTaskEvent({ message: `Created checkout: ${checkoutUrl}`, checkoutUrl, rawProxy });
      }

      // check if redirected
      if (redirectUrl) {
        if (/processing/i.test(redirectUrl)) {
          this._captchaToken = '';
          this._emitTaskEvent({ message: 'Processing payment', rawProxy });
          return States.PROCESS_PAYMENT;
        }

        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.SUBMIT_PAYMENT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }
      }

      if ((/captcha/i.test(body) || forceCaptcha) && !this._captchaToken) {
        this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
        return States.CAPTCHA;
      }

      const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);
      if (match && /review/i.test(match)) {
        this._emitTaskEvent({ message: 'Completing payment', rawProxy });
        return States.COMPLETE_PAYMENT;
      }

      if (match && /payment/i.test(match)) {
        this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
        return States.SUBMIT_PAYMENT;
      }

      if (match && /shipping/i.test(match)) {
        this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
        return States.SUBMIT_SHIPPING;
      }

      if (match && /process/i.test(match)) {
        this._emitTaskEvent({ message: 'Processing payment', rawProxy });
        return States.PROCESS_PAYMENT;
      }

      this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
      return States.SUBMIT_PAYMENT;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting payment - (${err.status || err.errno})`
          : 'Submitting payment';

      this._emitTaskEvent({ message, rawProxy });
      return States.SUBMIT_PAYMENT;
    }
  }

  async _handleCompletePayment() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        monitorDelay,
        store: { url, apiKey },
        type,
        forceCaptcha,
      },
    } = this._context;

    if (type === Modes.FAST) {
      return this._handleBackupCompletePayment();
    }

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
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
        body: this._formValues,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const body = await res.text();
      const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

      const redirectUrl = headers.get('location');
      if (match && match.length) {
        const [, step] = match;

        if (/processing/i.test(step)) {
          this._emitTaskEvent({ message: 'Processing payment', rawProxy });
          return States.PROCESS_PAYMENT;
        }

        if (/stock_problems/i.test(step)) {
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }

        if (/password/i.test(step)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }

        if (/throttle/i.test(step)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/contact_information/i.test(step)) {
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.SUBMIT_CUSTOMER;
        }

        if (/shipping_method/i.test(step)) {
          this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
          return States.SUBMIT_SHIPPING;
        }

        if (/payment_method/i.test(step)) {
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.SUBMIT_PAYMENT;
        }

        if (/review/i.test(step)) {
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }
      }

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/stock_problems/.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }

        if (/processing/.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Processing payment', rawProxy });
          return States.PROCESS_PAYMENT;
        }

        if (/password/.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }

        if (/throttle/.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }
      }

      if (/stock_problems/i.test(body)) {
        this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Completing payment', rawProxy });
        return States.COMPLETE_PAYMENT;
      }

      // recaptcha sitekey parser...
      const key = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
      if (key && key.length) {
        [, this._context.task.store.sitekey] = key;
        this._logger.debug('PARSED SITEKEY!: %j', this._context.task.store.sitekey);
      }

      if ((/recaptcha/i.test(body) || forceCaptcha) && !this._captchaToken) {
        this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
        return States.CAPTCHA;
      }

      this._emitTaskEvent({ message: 'Completing payment', rawProxy });
      return States.COMPLETE_PAYMENT;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Completing payment - (${err.status || err.errno})`
          : 'Completing payment';

      this._emitTaskEvent({ message, rawProxy });
      return States.COMPLTE_PAYMENT;
    }
  }

  async _handleBackupCompletePayment() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        store: { url, apiKey },
        monitorDelay,
        forceCaptcha,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let form = {
      complete: 1,
    };

    if (this._captchaToken) {
      form = {
        ...form,
        'g-recaptcha-response': this._captchaToken,
      };
    }

    try {
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'PATCH',
        compress: true,
        agent: proxy,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const body = await res.text();

      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          this._logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
        // TODO: toggle to send the checkout link to discord
        this._checkoutUrl = checkoutUrl;
        this._emitTaskEvent({ message: `Created checkout: ${checkoutUrl}`, checkoutUrl, rawProxy });
      }

      const redirectUrl = headers.get('location');
      if (redirectUrl) {
        if (/processing/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Processing payment', rawProxy });
          return States.PROCESS_PAYMENT;
        }

        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }
      }

      if ((/captcha/i.test(body) || forceCaptcha) && !this._captchaToken) {
        this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
        return States.CAPTCHA;
      }

      const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);

      if (match && match.length) {
        const [, step] = match;

        if (/processing/i.test(step)) {
          this._emitTaskEvent({ message: 'Processing payment', rawProxy });
          return States.PROCESS_PAYMENT;
        }

        if (/stock_problems/i.test(step)) {
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }

        if (/password/i.test(step)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }

        if (/throttle/i.test(step)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
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

          this._emitTaskEvent({ message: 'Polling queue', rawProxy });
          return States.QUEUE;
        }

        if (/contact_information/i.test(step)) {
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.SUBMIT_CUSTOMER;
        }

        if (/shipping_method/i.test(step)) {
          this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
          return States.SUBMIT_SHIPPING;
        }

        if (/payment_method/i.test(step)) {
          this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
          return States.SUBMIT_PAYMENT;
        }

        if (/review/i.test(step)) {
          this._emitTaskEvent({ message: 'Completing payment', rawProxy });
          return States.COMPLETE_PAYMENT;
        }
      }

      this._emitTaskEvent({ message: 'Completing payment', rawProxy });
      return States.COMPLETE_PAYMENT;
    } catch (err) {
      this._logger.error(
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Completing payment - (${err.status || err.errno})`
          : 'Completing payment';

      this._emitTaskEvent({ message, rawProxy });
      return States.COMPLETE_PAYMENT;
    }
  }

  async _handlePaymentProcess() {
    const {
      aborted,
      rawProxy,
      task: {
        store: { url, apiKey, name },
        product: { size, name: productName, url: productUrl, image },
        profile: { profileName },
        oneCheckout,
        type,
        monitorDelay,
      },
      proxy,
      slack,
      discord,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/wallets/checkouts/${this._checkoutToken}/payments`, {
        method: 'GET',
        compress: true,
        agent: proxy,
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
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const { payments } = body;

      if (payments && payments.length) {
        const bodyString = JSON.stringify(payments[0]);
        const [payment] = payments;

        const {
          currency,
          payment_due: paymentDue,
          web_url: webUrl,
          line_items: lineItems,
        } = payment.checkout;

        let productImage = image;
        if (!productImage) {
          productImage = lineItems[0].image_url;
        }

        this._logger.silly('CHECKOUT: Payment object: %j', payment);
        if (/thank_you/i.test(bodyString)) {
          const {
            order: { name: orderName, status_url: statusUrl },
          } = payment.checkout;

          const hooks = await notification(slack, discord, {
            success: true,
            type,
            checkoutUrl: webUrl,
            product: {
              name: productName,
              url: productUrl,
            },
            price: currencyWithSymbol(paymentDue, currency),
            store: { name, url },
            order: {
              number: orderName,
              url: statusUrl,
            },
            profile: profileName,
            size,
            image: `${productImage}`.startsWith('http') ? productImage : `https:${productImage}`,
          });

          this._events.emit(TaskManagerEvents.Webhook, hooks);
          if (oneCheckout) {
            this._events.emit(TaskManagerEvents.Success, this._context.task);
          }

          this._emitTaskEvent({
            message: `Payment successful! Order ${orderName}`,
            order: { number: orderName, url: statusUrl },
            status: 'success',
          });

          return States.DONE;
        }

        if (/your card was declined/i.test(bodyString)) {
          if (!this.webhookSent) {
            this.webhookSent = true;

            const hooks = await notification(slack, discord, {
              success: false,
              type,
              checkoutUrl: webUrl,
              product: {
                name: productName,
                url: productUrl,
              },
              price: currencyWithSymbol(paymentDue, currency),
              store: { name, url },
              order: null,
              profile: profileName,
              size,
              image: `${productImage}`.startsWith('http') ? productImage : `https:${productImage}`,
            });

            this._events.emit(TaskManagerEvents.Webhook, hooks);
          }

          const rewindToState =
            type === Modes.FAST || /dsm sg|dsm jp|dsm uk/i.test(name)
              ? States.PAYMENT_TOKEN
              : States.GO_TO_PAYMENT;
          this._emitTaskEvent({ message: 'Card declined!' });
          return rewindToState;
        }

        const { payment_processing_error_message: paymentProcessingErrorMessage } = payments[0];

        if (paymentProcessingErrorMessage !== null) {
          if (/no longer available/i.test(paymentProcessingErrorMessage)) {
            if (!this.webhookSent) {
              this.webhookSent = true;

              const hooks = await notification(slack, discord, {
                success: false,
                type,
                checkoutUrl: webUrl,
                product: {
                  name: productName,
                  url: productUrl,
                },
                price: currencyWithSymbol(paymentDue, currency),
                store: { name, url },
                order: null,
                profile: profileName,
                size,
                image: `${productImage}`.startsWith('http')
                  ? productImage
                  : `https:${productImage}`,
              });

              this._events.emit(TaskManagerEvents.Webhook, hooks);
            }

            const rewindToState =
              type === Modes.FAST || /dsm sg|dsm jp|dsm uk/i.test(name)
                ? States.PAYMENT_TOKEN
                : States.GO_TO_PAYMENT;

            this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms` });
            return rewindToState;
          }

          if (!this.webhookSent) {
            this.webhookSent = true;

            const hooks = await notification(slack, discord, {
              success: false,
              type,
              checkoutUrl: webUrl,
              product: {
                name: productName,
                url: productUrl,
              },
              price: currencyWithSymbol(paymentDue, currency),
              store: { name, url },
              order: null,
              profile: profileName,
              size,
              image: `${productImage}`.startsWith('http') ? productImage : `https:${productImage}`,
            });

            this._events.emit(TaskManagerEvents.Webhook, hooks);
          }

          const rewindToState =
            type === Modes.FAST || /dsm sg|dsm jp|dsm uk/i.test(name)
              ? States.PAYMENT_TOKEN
              : States.GO_TO_PAYMENT;

          this._emitTaskEvent({ message: 'Payment failed!' });
          return rewindToState;
        }
      }
      this._logger.silly('CHECKOUT: Processing payment');
      this._emitTaskEvent({ message: 'Processing payment', rawProxy });
      this._delayer = waitForDelay(1000, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Processing payment', rawProxy });
      return States.PROCESS_PAYMENT;
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Process Payment.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      if (/invalid json response/i.test(err.message)) {
        this._emitTaskEvent({ message: 'Processing payment' });
        return States.BACKUP_PROCESS_PAYMENT;
      }

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.PROCESS_PAYMENT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Processing payment - (${err.status || err.errno})`
          : 'Processing payment';

      this._emitTaskEvent({ message, rawProxy });
      return States.PROCESS_PAYMENT;
    }
  }

  async _handleBackupProcessPayment() {
    const {
      aborted,
      rawProxy,
      task: {
        store: { url, apiKey },
      },
      proxy,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Processing payment',
          nextState: States.BACKUP_PROCESS_PAYMENT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');

      if (redirectUrl) {
        if (/thank_you/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Payment successful!', rawProxy });
          return States.DONE;
        }
      }

      const body = await res.text();

      if (/Card was decline/i.test(body)) {
        this._emitTaskEvent({ message: 'Card declined!', rawProxy });
        return States.SUBMIT_PAYMENT;
      }

      if (/no match|Your payment can’t be processed/i.test(body)) {
        this._emitTaskEvent({ message: 'Payment failed!', rawProxy });
        return States.SUBMIT_PAYMENT;
      }
      this._emitTaskEvent({ message: 'Processing payment', rawProxy });
      this._delayer = waitForDelay(1000, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Processing payment', rawProxy });
      return States.PROCESS_PAYMENT;
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Process Payment.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.BACKUP_PROCESS_PAYMENT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          this._emitTaskEvent({ message, rawProxy });
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Processing payment - (${err.status || err.errno})`
          : 'Processing payment';

      this._emitTaskEvent({ message, rawProxy });
      return States.BACKUP_PROCESS_PAYMENT;
    }
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    this._logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.LOGIN]: this._handleLogin,
      [States.PAYMENT_TOKEN]: this._handlePaymentToken,
      [States.GET_SITE_DATA]: this._handleGetSiteData,
      [States.CREATE_CHECKOUT]: this._handleCreateCheckout,
      [States.GO_TO_CHECKPOINT]: this._handleGetCheckpoint,
      [States.SUBMIT_CHECKPOINT]: this._handleSubmitCheckpoint,
      [States.QUEUE]: this._handlePollQueue,
      [States.WAIT_FOR_PRODUCT]: this._handleWaitForProduct,
      [States.ADD_TO_CART]: this._handleAddToCart,
      [States.CLEAR_CART]: this._handleClearCart,
      [States.GO_TO_CART]: this._handleGoToCart,
      [States.GO_TO_CHECKOUT]: this._handleGetCheckout,
      [States.CAPTCHA]: this._handleRequestCaptcha,
      [States.SUBMIT_CUSTOMER]: this._handleSubmitCustomer,
      [States.GO_TO_SHIPPING]: this._handleGetShipping,
      [States.SUBMIT_SHIPPING]: this._handleSubmitShipping,
      [States.GO_TO_PAYMENT]: this._handleGetPayment,
      [States.SUBMIT_PAYMENT]: this._handleSubmitPayment,
      [States.COMPLETE_PAYMENT]: this._handleCompletePayment,
      [States.PROCESS_PAYMENT]: this._handlePaymentProcess,
      [States.BACKUP_PROCESS_PAYMENT]: this._handleBackupProcessPayment,
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
