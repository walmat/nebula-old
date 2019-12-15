/* eslint-disable no-nested-ternary */
import cheerio from 'cheerio';
import { min, isEmpty } from 'lodash';
import { parse } from 'query-string';

import { Bases, Utils, Constants, Classes } from '../../common';
import { Task as TaskConstants } from '../constants';
import { Forms, stateForError, getHeaders, pickVariant } from '../utils';

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
  constructor(context, platform = Platforms.Shopify) {
    super(context, platform);

    this._state = States.STARTED;
    this._prevState = this._state;

    // decide what our start state should be!
    if (!this.context.task.store.apiKey) {
      this._state = States.GATHER_DATA;
    } else if (this.context.task.account) {
      this._state = States.LOGIN;
    } else if (this.context.task.type === Modes.FAST) {
      this._state = States.CREATE_CHECKOUT;
    } else {
      this._state = States.WAIT_FOR_PRODUCT;
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
    this._paymentToken = null;
    this._checkoutHash = null;
    this._checkoutKey = null;
    this._storeId = null;
    this._form = null;
  }

  async _handleLogin() {
    const {
      aborted,
      task: {
        store: { url },
        account: { username, password },
        monitor,
        type,
      },
      captchaToken,
      logger,
      proxy,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/account/login`, {
        method: 'POST',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        redirect: 'manual',
        follow: 0,
        headers: {
          'user-agent': userAgent,
          'content-type': 'application/x-www-form-urlencoded',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
          origin: url,
        },
        body: `form_type=customer_login&utf8=%E2%9C%93&customer%5Bemail%5D=${encodeURIComponent(
          username,
        )}&customer%5Bpassword%5D=${encodeURIComponent(password)}&return_url=%2Faccount`,
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');

      if (!redirectUrl) {
        const message = status ? `Logging in - (${status})` : 'Logging in';
        emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        return States.LOGIN;
      }

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
        emitEvent(this.context, [this.context.id], { message: 'Password page' }, Events.TaskStatus);
        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;
        emitEvent(this.context, [this.context.id], { message: 'Logging in' }, Events.TaskStatus);
        return States.LOGIN;
      }

      if (/challenge/i.test(redirectUrl)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Login capcha needed' },
          Events.TaskStatus,
        );
        return States.ERROR;
      }

      if (/login/i.test(redirectUrl)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Invalid credentials' },
          Events.TaskStatus,
        );
        return States.ERROR;
      }

      if (/account/i.test(redirectUrl)) {
        this._needsLogin = false; // update global check for login

        if (type === Modes.SAFE && !captchaToken) {
          if (this.context.task.product.variants && this.context.task.product.variants.length) {
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
        }

        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Creating checkout' },
          Events.TaskStatus,
        );

        return States.CREATE_CHECKOUT;
      }

      const message = status ? `Logging in - (${status})` : 'Logging in';
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.LOGIN;
    } catch (err) {
      logger.error('Login Error: %s\n %j', err.status || err.errno, err.message);

      const nextState = stateForError(err, {
        message: 'Logging in',
        nextState: States.LOGIN,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno ? `Logging in - (${err.status || err.errno})` : 'Logging in';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
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
      logger,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      let res = await this._fetch('https://elb.deposit.shopifycs.com/sessions', {
        method: 'OPTIONS',
        compress: true,
        agent: proxy ? proxy.proxy : null,
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
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Creating payment token' },
          Events.TaskStatus,
        );
        return States.PAYMENT_TOKEN;
      }

      res = await this._fetch('https://elb.deposit.shopifycs.com/sessions', {
        method: 'POST',
        compress: true,
        agent: proxy ? proxy.proxy : null,
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
            number: payment.card,
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const { id } = await res.json();

      if (id) {
        logger.silly('Payment token: %s', id);
        this._paymentToken = id;
        return States.SUBMIT_PAYMENT;
      }

      return States.PAYMENT_TOKEN;
    } catch (err) {
      logger.error(
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Creating payment session - (${err.status || err.errno})`
          : 'Creating payment session';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.PAYMENT_TOKEN;
    }
  }

  async _handleGatherData() {
    const {
      aborted,
      proxy,
      task: {
        store: { url },
        type,
      },
      logger,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(url, {
        method: 'GET',
        compress: true,
        agent: proxy ? proxy.proxy : null,
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const body = await res.text();
      let match = body.match(/<meta\s*name="shopify-checkout-api-token"\s*content="(.*)">/);

      let accessToken;
      if (match && match.length) {
        [, accessToken] = match;
        this.context.task.store.apiKey = accessToken;
      }

      if (!accessToken) {
        // check the script location as well
        match = body.match(/"accessToken":(.*)","betas"/);

        if (!match || !match.length) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Invalid Shopify store' },
            Events.TaskStatus,
          );
          return States.ERROR;
        }
        [, accessToken] = match;
        this.context.task.store.apiKey = accessToken;
      }
      if (type === Modes.SAFE) {
        if (!this._needsLogin) {
          if (this.context.task.product.variants && this.context.task.product.variants.length) {
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
        }
        emitEvent(this.context, [this.context.id], { message: 'Logging in' }, Events.TaskStatus);
        return States.LOGIN;
      }
      if (!this._needsLogin) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Creating checkout' },
          Events.TaskStatus,
        );
        return States.CREATE_CHECKOUT;
      }
      emitEvent(this.context, [this.context.id], { message: 'Logging in' }, Events.TaskStatus);
      return States.LOGIN;
    } catch (err) {
      logger.error(
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno ? `Logging in - (${err.status || err.errno})` : 'Logging in';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.LOGIN;
    }
  }

  async _handleGetCheckpoint() {
    const {
      aborted,
      proxy,
      logger,
      task: {
        monitor,
        store: { url, apiKey },
      },
    } = this.context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(this.checkpointUrl, {
        method: 'GET',
        compress: true,
        agent: proxy ? proxy.proxy : null,
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      logger.debug('Checkpoint redirect url: %j', redirectUrl);

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

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );
          return States.QUEUE;
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this._storeId, , this._checkoutToken] = redirectUrl.split('/');
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkout' },
            Events.TaskStatus,
          );
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
        logger.info('Checkpoint form value detected: { name: %j, value: %j }', name, value);

        if (name) {
          this._formValues += `${name}=${value ? value.replace(/\s/g, '+') : ''}&`;
        }
      });

      // recaptcha sitekey parser...
      const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
      if (match && match.length) {
        [, this.context.task.store.sitekey] = match;
        logger.debug('PARSED SITEKEY!: %j', this.context.task.store.sitekey);
      }

      if (this._formValues.endsWith('&')) {
        this._formValues = this._formValues.slice(0, -1);
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Waiting for captcha' },
        Events.TaskStatus,
      );
      return States.CAPTCHA;
    } catch (err) {
      logger.error(
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Going to checkpoint - (${err.status || err.errno})`
          : 'Going to checkpoint';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.GO_TO_CHECKPOINT;
    }
  }

  async _handleSubmitCheckpoint() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        monitor,
        store: { url, apiKey },
      },
      captchaToken,
    } = this.context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    emitEvent(
      this.context,
      [this.context.id],
      { message: 'Submitting checkpoint' },
      Events.TaskStatus,
    );

    if (captchaToken && !/g-recaptcha-response/i.test(this._formValues)) {
      const parts = this._formValues.split('&');
      if (parts && parts.length) {
        this._formValues = '';
        // eslint-disable-next-line array-callback-return
        parts.forEach(part => {
          if (/authenticity_token/i.test(part)) {
            this._formValues += `${part}&g-recaptcha-response=${captchaToken}&`;
          } else {
            this._formValues += `${part}&`;
          }
        });
      }
    }

    if (this._formValues.endsWith('&')) {
      this._formValues = this._formValues.slice(0, -1);
    }

    logger.debug('CHECKPOINT FORM: %j', this._formValues);

    try {
      const res = await this._fetch(`/checkpoint`, {
        method: 'POST',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: this._formValues,
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      logger.debug('Checkpoint redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (/checkout/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Creating checkout' },
            Events.TaskStatus,
          );
          return States.CREATE_CHECKOUT;
        }

        if (/checkpoint/i.test(redirectUrl)) {
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

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );
          return States.QUEUE;
        }

        if (/cart/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Creating checkout' },
            Events.TaskStatus,
          );
          return States.CREATE_CHECKOUT;
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this._storeId, , this._checkoutToken] = redirectUrl.split('/');
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkout' },
            Events.TaskStatus,
          );
          return States.GO_TO_CHECKOUT;
        }
      }

      const message = status ? `Submitting checkpoint - (${status})` : 'Submitting checkpoint';
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.SUBMIT_CHECKPOINT;
    } catch (err) {
      logger.error(
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Going to checkpoint - (${err.status || err.errno})`
          : 'Going to checkpoint';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.GO_TO_CHECKPOINT;
    }
  }

  async _handleCreateCheckout() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        monitor,
        store: { url, name, apiKey },
        type,
      },
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
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
        agent: proxy ? proxy.proxy : null,
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      logger.debug('Create checkout redirect url: %j', redirectUrl);

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
          [, , , this._storeId, , this._checkoutToken] = redirectUrl.split('/');
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkout' },
            Events.TaskStatus,
          );
          return States.GO_TO_CHECKOUT;
        }

        if (/cart/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Adding to cart' },
            Events.TaskStatus,
          );
          return States.ADD_TO_CART;
        }
      }

      const message = status ? `Creating checkout - (${status})` : 'Creating checkout';
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
          ? `Creating checkout - (${err.status || err.errno})`
          : 'Creating checkout';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.CREATE_CHECKOUT;
    }
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
          [, , , this._storeId, , this._checkoutToken] = redirectUrl.split('/');

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

      const message = status ? `Creating checkout - (${status})` : 'Creating checkout';
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
          ? `Creating checkout - (${err.status || err.errno})`
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
          [, , , this._storeId, , this._checkoutToken] = checkoutUrl.split('/');
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting information' },
            Events.TaskStatus,
          );
          return States.SUBMIT_CUSTOMER;
        }
      }

      const message = status ? `Creating checkout - (${status})` : 'Creating checkout';
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
          ? `Creating checkout - (${err.status || err.errno})`
          : 'Creating checkout';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.CREATE_CHECKOUT;
    }
  }

  async _handlePollQueue() {
    const {
      aborted,
      logger,
      task: {
        type,
        store: { url, apiKey },
      },
      proxy,
      timers: { monitor },
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let message;
    let nextState;
    try {
      const res = await this._fetch(`${url}/checkout/poll?js_poll=1`, {
        method: 'GET',
        compress: true,
        agent: proxy ? proxy.proxy : null,
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

      logger.debug('Checkout: poll response %d', status);
      nextState = stateForError(
        { status },
        {
          message: 'Polling queue',
          nextState: States.QUEUE,
        },
      );

      if (nextState) {
        if (nextState.message) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: nextState.message },
            Events.TaskStatus,
          );
        }
        return nextState.nextState;
      }

      if (status === 400) {
        emitEvent(this.context, [this.context.id], { message: 'Invalid queue' }, Events.TaskStatus);
        return States.CREATE_CHECKOUT;
      }

      const body = await res.text();

      let redirectUrl = headers.get('location');
      logger.debug('CHECKOUT: Queue response: %j \nBody: %j', status, body);
      if (status === 302) {
        if (!redirectUrl || /throttle/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Waiting in queue' },
            Events.TaskStatus,
          );
          return States.QUEUE;
        }

        if (/_ctd/i.test(redirectUrl)) {
          try {
            const response = await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy ? proxy.proxy : null,
              redirect: 'manual',
              headers: {
                ...getHeaders({ url, apiKey }),
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': userAgent,
                Connection: 'Keep-Alive',
              },
            });

            const respBody = await response.text();

            logger.debug('NEW QUEUE BODY: %j', respBody);

            const [, checkoutUrl] = respBody.match(/href="(.*)"/);

            if (checkoutUrl && /checkouts/i.test(checkoutUrl)) {
              const [checkoutNoQs] = checkoutUrl.split('?');
              [, , , this._storeId, , this._checkoutToken] = checkoutNoQs.split('/');
              if (type === Modes.FAST) {
                monitor.start();
              }

              ({ message, nextState } = StateMap[this._prevState](
                type,
                this.context.task,
                this._selectedShippingRate,
              ));

              emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
              return nextState;
            }
          } catch (e) {
            logger.error('Error fetching cookied checkout: %j', e);
          }
        }
        logger.silly('CHECKOUT: Polling queue redirect url %s...', redirectUrl);
      } else if (status === 200) {
        if (isEmpty(body) || (!isEmpty(body) && body.length < 2)) {
          let ctd;
          if (!this._ctd) {
            ctd = await this.getCookie(this.context.jar, '_ctd');
          } else {
            ctd = this._ctd;
          }

          try {
            const response = await this._fetch(`${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`, {
              method: 'GET',
              compress: true,
              agent: proxy ? proxy.proxy : null,
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
            logger.debug('QUEUE: 200 RESPONSE BODY: %j', respBody);

            const match = respBody.match(/href="(.*)"/);

            if (match && match.length) {
              const [, checkoutUrl] = match;
              logger.debug('QUEUE: checkoutUrl: %j', checkoutUrl);
              if (checkoutUrl && /checkouts/i.test(checkoutUrl)) {
                const [checkoutNoQs] = checkoutUrl.split('?');
                [, , , this._storeId, , this._checkoutToken] = checkoutNoQs.split('/');
                if (type === Modes.FAST) {
                  monitor.start();
                }
                ({ message, nextState } = StateMap[this._prevState](
                  type,
                  this.context.task,
                  this._selectedShippingRate,
                ));

                emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
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
      logger.debug('QUEUE: RedirectUrl at end of fn body: %j', redirectUrl);

      if (redirectUrl && /checkpoint/i.test(redirectUrl)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Going to checkpoint' },
          Events.TaskStatus,
        );
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
          this.context.task,
          this._selectedShippingRate,
        ));

        emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        return nextState;
      }
      logger.silly('CHECKOUT: Not passed queue, delaying 5000ms');
      message = status ? `Not through queue! (${status})` : 'Not through queue!';
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      this._delayer = waitForDelay(5000, this._aborter.signal);
      await this._delayer;
      emitEvent(this.context, [this.context.id], { message: 'Polling queue' }, Events.TaskStatus);
      return States.QUEUE;
    } catch (err) {
      logger.error(
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
          emitEvent(
            this.context,
            [this.context.id],
            { message: nextState.message },
            Events.TaskStatus,
          );
        }
        return nextState.nextState;
      }

      message =
        err.status || err.errno ? `Polling queue - (${err.status || err.errno})` : 'Polling queue';
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);

      return States.QUEUE;
    }
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
      aborted,
      logger,
      task: {
        store: { name, url },
        product: { variant, hash, restockUrl },
        type,
        monitor,
      },
      proxy,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._isRestocking || type === Modes.FAST) {
      return this._handleBackupAddToCart();
    }

    try {
      const res = await this._fetch('/cart/add.js', {
        method: 'POST',
        compress: true,
        agent: proxy ? proxy.proxy : null,
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
        body: addToCart(variant.id, name, hash),
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
      logger.silly('FRONTEND CHECKOUT: Add to cart redirect url: %s', redirectUrl);

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
            { message: 'Adding to cart' },
            Events.TaskStatus,
          );
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

      const body = await res.text();

      if (/cannot find variant/i.test(body)) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Variant not found!' },
          Events.TaskStatus,
        );
        this._delayer = waitForDelay(monitor, this._aborter.signal);
        await this._delayer;
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Adding to cart' },
          Events.TaskStatus,
        );
        return States.ADD_TO_CART;
      }

      if (this._checkoutUrl) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Going to checkout' },
          Events.TaskStatus,
        );
        return States.GO_TO_CHECKOUT;
      }

      emitEvent(this.context, [this.context.id], { message: 'Going to cart' }, Events.TaskStatus);
      return States.GO_TO_CART;
    } catch (err) {
      logger.error(
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Adding to cart - (${err.status || err.errno})`
          : 'Adding to cart';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.ADD_TO_CART;
    }
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
      const res = await this._fetch(`/wallets/checkouts/${this._checkoutToken}.json`, {
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
        err.status || err.errno
          ? `Adding to cart - (${err.status || err.errno})`
          : 'Adding to cart';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.ADD_TO_CART;
    }
  }

  async _handleGoToCart() {
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
      const res = await this._fetch(`${url}/cart`, {
        method: 'GET',
        compress: true,
        agent: proxy ? proxy.proxy : null,
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');

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
            { message: 'Going to cart' },
            Events.TaskStatus,
          );
          return States.GO_TO_CART;
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
      }

      const body = await res.text();

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
          !/q|g|gender|\$fields|email|subscribe|updates\[.*:.*]/i.test(name) &&
          !/update cart|Update|{{itemQty}}/i.test(value)
        ) {
          this._cartForm += `${name}=${value ? value.replace(/\s/g, '+') : ''}&`;
        }
      });

      if (this._cartForm.endsWith('&')) {
        this._cartForm = this._cartForm.slice(0, -1);
      }

      logger.info('Cart form parsed: %j', this._cartForm);

      if (this._needsLogin) {
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
        { message: 'Creating checkout' },
        Events.TaskStatus,
      );

      return States.CREATE_CHECKOUT;
    } catch (err) {
      logger.error(
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno ? `Going to cart - (${err.status || err.errno})` : 'Going to cart';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.GO_TO_CART;
    }
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
      aborted,
      logger,
      task: {
        store: { url, name, apiKey },
        monitor,
        captcha,
        restockMode,
        type,
      },
      captchaToken,
      proxy,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (type === Modes.FAST) {
      return this._handleBackupGetCheckout();
    }

    try {
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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
      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      const redirectUrl = headers.get('location');
      logger.silly(`CHECKOUT: Get checkout redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/login/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Account needed' },
            Events.TaskStatus,
          );

          return States.DONE;
        }

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
            { message: 'Going to checkout' },
            Events.TaskStatus,
          );

          return States.GO_TO_CHECKOUT;
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
          if (/dsm sg|dsm uk|dsm jp/i.test(name) && restockMode) {
            emitEvent(
              this.context,
              [this.context.id],
              { message: 'Creating checkout' },
              Events.TaskStatus,
            );

            this._isRestocking = true;
            return States.CREATE_CHECKOUT;
          }

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
            { message: 'Going to checkout' },
            Events.TaskStatus,
          );

          return States.GO_TO_CHECKOUT;
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
          { message: 'Going to checkout' },
          Events.TaskStatus,
        );

        return States.GO_TO_CHECKOUT;
      }

      // form parser...
      this._formValues = await parseForm(
        $,
        States.GO_TO_CHECKOUT,
        this._checkoutToken,
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
        { message: 'Submitting information' },
        Events.TaskStatus,
      );

      return States.SUBMIT_CUSTOMER;
    } catch (err) {
      logger.error(
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Going to checkout - (${err.status || err.errno})`
          : 'Going to checkout';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.GO_TO_CHECKOUT;
    }
  }

  async _handleBackupGetCheckout() {
    const {
      aborted,
      logger,
      task: {
        store: { url, apiKey },
        monitor,
        captcha,
      },
      captchaToken,
      proxy,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'GET',
        compress: true,
        agent: proxy ? proxy.proxy : null,
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      logger.silly('CHECKOUT: Get checkout redirect url: %s', redirectUrl);

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

        if (/login/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Account needed' },
            Events.TaskStatus,
          );

          return States.DONE;
        }

        if (/cart/i.test(redirectUrl)) {
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
            { message: 'Going to checkout' },
            Events.TaskStatus,
          );

          return States.GO_TO_CHECKOUT;
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
            { message: 'Going to checkout' },
            Events.TaskStatus,
          );

          return States.GO_TO_CHECKOUT;
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

      const body = await res.text();

      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
        this._checkoutUrl = checkoutUrl;
      }

      // recaptcha sitekey parser...
      const match = body.match(/.*<noscript>.*<iframe\s.*src=.*\?k=(.*)"><\/iframe>/);
      if (match && match.length) {
        [, this.context.task.store.sitekey] = match;
        logger.debug('PARSED SITEKEY!: %j', this.context.task.store.sitekey);
      }

      if (this._selectedShippingRate.id) {
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
          { message: 'Submitting payment' },
          Events.TaskStatus,
        );

        return States.SUBMIT_PAYMENT;
      }

      emitEvent(this.context, [this.context.id], { message: 'Fetching rates' }, Events.TaskStatus);

      return States.GO_TO_SHIPPING;
    } catch (err) {
      logger.error(
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Going to checkout - (${err.status || err.errno})`
          : 'Going to checkout';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.GO_TO_CHECKOUT;
    }
  }

  async _handleSubmitCustomer() {
    const {
      aborted,
      logger,
      proxy,
      task: {
        monitor,
        store: { url, apiKey },
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
      return this._handleBackupSubmitCustomer();
    }

    if (captchaToken && !/g-recaptcha-response/i.test(this._formValues)) {
      const parts = this._formValues.split('button=');
      if (parts && parts.length) {
        this._formValues = '';
        parts.forEach((part, i) => {
          if (i === 0) {
            this._formValues += `${part}g-recaptcha-response=${captchaToken}`;
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
        agent: proxy ? proxy.proxy : null,
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      // if we followed a redirect at some point...
      const redirectUrl = headers.get('location');
      logger.error('SUBMIT CUSTOMER REDIRECT URL: %s', redirectUrl);
      if (redirectUrl) {
        this._redirectUrl = redirectUrl;
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
            { message: 'Submitting information' },
            Events.TaskStatus,
          );

          return States.GO_TO_CHECKOUT;
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
            { message: 'Submitting information' },
            Events.TaskStatus,
          );

          return States.SUBMIT_CUSTOMER;
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
            { message: `Out of stock, delaying ${monitor}ms` },
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

          return States.GO_TO_CHECKOUT;
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

        if (/step=payment_method/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting payment' },
            Events.TaskStatus,
          );

          return States.GO_TO_PAYMENT;
        }
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Submitting information' },
        Events.TaskStatus,
      );

      return States.GO_TO_CHECKOUT;
    } catch (err) {
      logger.error(
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Submitting information - (${err.status || err.errno})`
          : 'Submitting information';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.SUBMIT_CUSTOMER;
    }
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
      const res = await this._fetch(`/wallets/checkouts/${this._checkoutToken}.json`, {
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
          ? `Submitting information - (${err.status || err.errno})`
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
        this._redirectUrl || `/${this._storeId}/checkouts/${this._checkoutToken}`,
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
      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
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
      this._formValues = await parseForm(
        $,
        States.GO_TO_SHIPPING,
        this._checkoutToken,
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
        err.status || err.errno
          ? `Fetching rates - (${err.status || err.errno})`
          : 'Fetching rates';

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
      const res = await this._fetch(
        `/wallets/checkouts/${this._checkoutToken}/shipping_rates.json`,
        {
          method: 'GET',
          compress: true,
          agent: proxy ? proxy.proxy : null,
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
        err.status || err.errno
          ? `Fetching rates - (${err.status || err.errno})`
          : 'Fetching rates';

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
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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
          ? `Submitting shipping - (${err.status || err.errno})`
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
        this._redirectUrl || `/${this._storeId}/checkouts/${this._checkoutToken}`,
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
      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
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
      this._formValues = await parseForm(
        $,
        States.GO_TO_PAYMENT,
        this._checkoutToken,
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

      if (!this._paymentToken && priceRecap !== '0') {
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
          ? `Submitting payment - (${err.status || err.errno})`
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
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      this.needsPaymentToken = true;
      this._paymentToken = '';

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
          ? `Submitting payment - (${err.status || err.errno})`
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
      s: this._paymentToken,
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
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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

      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
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
          ? `Submitting payment - (${err.status || err.errno})`
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
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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
          ? `Completing payment - (${err.status || err.errno})`
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
      const res = await this._fetch(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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

      if (!this._checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this._checkoutKey] = match;
          logger.silly('CHECKOUT: Checkout authorization key: %j', this._checkoutKey);
        }
      }

      let checkoutUrl;
      if (this._storeId && this._checkoutToken && this._checkoutKey) {
        checkoutUrl = `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._checkoutKey}`;
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
          ? `Completing payment - (${err.status || err.errno})`
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
      const res = await this._fetch(`${url}/wallets/checkouts/${this._checkoutToken}/payments`, {
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
          ? `Processing payment - (${err.status || err.errno})`
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
