/* eslint-disable no-nested-ternary */
import cheerio from 'cheerio';
import { isEqual, isEmpty, min } from 'lodash';
import { parse } from 'query-string';
import HttpsProxyAgent from 'https-proxy-agent';
import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

import Timer from '../../common/timer';
import { notification } from '../hooks';
import Discord from '../hooks/discord';
import Slack from '../hooks/slack';
import AsyncQueue from '../../common/asyncQueue';
import { waitForDelay, userAgent, currencyWithSymbol } from '../../common';
import { Runner, Manager, Platforms, SiteKeyForPlatform } from '../../constants';
import { TaskRunner, Monitor } from '../utils/constants';
import { stateForError, getHeaders } from '../utils';
import { addToCart, parseForm, patchCheckoutForm } from '../utils/forms';
import pickVariant from '../utils/pickVariant';

const { Events } = Runner;
const { Events: TaskManagerEvents } = Manager;
const { States, Types, DelayTypes, HookTypes, Modes, StateMap, HarvestStates } = TaskRunner;
const { ParseType } = Monitor;

class TaskRunnerPrimitive {
  get state() {
    return this._state;
  }

  constructor(context, proxy, type, platform = Platforms.Shopify) {
    // Add Ids to object
    this.id = context.id;
    this._task = context.task;
    this.taskId = context.taskId;
    this.proxy = proxy;
    this._events = context.events;
    this._aborter = new AbortController();
    this._signal = this._aborter.signal;
    // eslint-disable-next-line global-require
    const _request = require('fetch-cookie')(fetch, context.jar);
    this._request = defaults(_request, this._task.site.url, {
      timeout: 60000, // to be overridden as necessary
      signal: this._aborter.signal, // generic abort signal
    });
    this._parseType = type;
    this._platform = platform;

    this._delayer = null;
    this._captchaQueue = null;

    this._timers = {
      checkout: new Timer(),
      monitor: new Timer(),
    };
    this._discord = new Discord(this._task.discord);
    this._slack = new Slack(this._task.slack);
    this._logger = context.logger;

    const p = proxy ? new HttpsProxyAgent(proxy.proxy) : null;

    if (p) {
      p.options.maxSockets = Infinity;
      p.options.maxFreeSockets = Infinity;
      p.options.keepAlive = true;
      p.maxFreeSockets = Infinity;
      p.maxSockets = Infinity;
    }

    /**
     * The context of this task runner
     *
     * This is a wrapper that contains all data about the task runner.
     * @type {TaskRunnerContext}
     */
    this._context = {
      ...context,
      proxy: p,
      rawProxy: proxy ? proxy.raw : 'localhost',
      parseType: this._parseType,
      aborter: this._aborter,
      delayer: this._delayer,
      signal: this._aborter.signal,
      request: this._request,
      timers: this._timers,
      discord: this._discord,
      slack: this._slack,
      logger: this._logger,
      harvestState: HarvestStates.idle,
    };

    this._needsLogin = this._context.task.account || false;
    this._state = States.STARTED;

    // decide what our start state should be!
    if (!this._context.task.site.apiKey) {
      this._state = States.GET_SITE_DATA;
    } else if (this._needsLogin) {
      this._state = States.LOGIN;
    } else if (
      /dsm uk|dsm jp|dsm sg/i.test(this._context.task.site.name) ||
      (!/dsm us/i.test(this._context.task.site.name) && this._context.task.type === Modes.FAST)
    ) {
      this._state = States.CREATE_CHECKOUT;
    } else {
      this._state = States.WAIT_FOR_PRODUCT;
    }

    this._deregisterOverride = false;

    this._history = [];

    const preFetchedShippingRates = this._context.task.profile.rates.find(
      r => r.site.url === this._context.task.site.url,
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

    this._handleAbort = this._handleAbort.bind(this);
    this._handleDelay = this._handleDelay.bind(this);
    this._handleProduct = this._handleProduct.bind(this);
    this._handleDeregisterProxy = this._handleDeregisterProxy.bind(this);

    this._events.on(TaskManagerEvents.ChangeDelay, this._handleDelay, this);
    this._events.on(TaskManagerEvents.UpdateHook, this._handleUpdateHooks, this);
    this._events.on(TaskManagerEvents.ProductFound, this._handleProduct, this);
    this._events.on(TaskManagerEvents.DeregisterProxy, this._handleDeregisterProxy, this);
  }

  _handleAbort(id) {
    if (id === this._context.id) {
      this._context.aborted = true;
      this._aborter.abort();
      if (this._delayer) {
        this._delayer.clear();
      }
    }
  }

  _handleHarvest(id, token) {
    if (id === this._context.id && this._captchaQueue) {
      this._captchaQueue.insert(token);
    }
  }

  async _compareProductInput(product, parseType) {
    // we only care about keywords/url matching here...
    switch (parseType) {
      case ParseType.Keywords: {
        const { pos_keywords: posKeywords, neg_keywords: negKeywords } = this._context.task.product;
        const samePositiveKeywords = isEqual(product.pos_keywords.sort(), posKeywords.sort());
        const sameNegativeKeywords = isEqual(product.neg_keywords.sort(), negKeywords.sort());
        return samePositiveKeywords && sameNegativeKeywords;
      }
      case ParseType.Url: {
        const { url } = this._context.task.product;
        return url && product.url.toUpperCase() === url.toUpperCase();
      }
      default:
        return false;
    }
  }

  async _handleProduct(id, product, parseType) {
    if (parseType === this._parseType && !this._isChecking) {
      this._isChecking = true;
      const isSameProductData = await this._compareProductInput(product, parseType);

      if (
        (isSameProductData && !this._context.task.product.variants) ||
        (id === this.id && !this._context.task.product.variants)
      ) {
        this._context.task.product = {
          ...this._context.task.product,
          ...product,
        };
      } else {
        this._isChecking = false;
      }
    }
  }

  _handleDeregisterProxy(id) {
    if (id === this._context.id) {
      this._deregisterOverride = true;
      if (this._delayer) {
        this._delayer.clear();
      }
    }
  }

  _handleDelay(id, delay, type) {
    if (id === this._context.id) {
      if (type === DelayTypes.error) {
        this._context.task.errorDelay = delay;
      } else if (type === DelayTypes.monitor) {
        this._context.task.monitorDelay = delay;
      }
      if (this._delayer) {
        this._delayer.clear();
      }
    }
  }

  _handleUpdateHooks(id, hook, type) {
    if (id === this._context.id) {
      if (type === HookTypes.Discord) {
        this._context.task.discord = hook;
      } else if (type === HookTypes.Slack) {
        this._context.task.slack = hook;
      }
    }
  }

  _cleanup() {
    console.log(this._history);
    this.stopHarvestCaptcha();
  }

  getCaptcha() {
    if (this._context.harvestState === HarvestStates.idle) {
      this._captchaQueue = new AsyncQueue();
      this._events.on(TaskManagerEvents.Harvest, this._handleHarvest, this);
      this._context.harvestState = HarvestStates.start;
    }

    if (this._context.harvestState === HarvestStates.suspend) {
      this._context.harvestState = HarvestStates.start;
    }

    if (this._context.harvestState === HarvestStates.start) {
      this._logger.silly('[DEBUG]: Starting harvest...');
      this._events.emit(
        TaskManagerEvents.StartHarvest,
        this._context.id,
        this._context.task.site.sitekey || SiteKeyForPlatform[this._platform],
        'http://checkout.shopify.com',
      );
    }

    // return the captcha request
    return this._captchaQueue.next();
  }

  suspendHarvestCaptcha() {
    if (this._context.harvestState === HarvestStates.start) {
      this._logger.silly('[DEBUG]: Suspending harvest...');
      this._events.emit(TaskManagerEvents.StopHarvest, this._context.id);
      this._context.harvestState = HarvestStates.suspend;
    }
  }

  stopHarvestCaptcha() {
    const { harvestState } = this._context;
    if (harvestState === HarvestStates.start || harvestState === HarvestStates.suspend) {
      this._captchaQueue.destroy();
      this._captchaQueue = null;
      this._logger.silly('[DEBUG]: Stopping harvest...');
      this._events.emit(TaskManagerEvents.StopHarvest, this._context.id);
      this._events.removeListener(TaskManagerEvents.Harvest, this._handleHarvest, this);
      this._context.harvestState = HarvestStates.stop;
    }
  }

  async swapProxies() {
    // emit the swap event
    this._events.emit(Events.SwapTaskProxy, this.id, this.proxy, this.shouldBanProxy);
    return new Promise((resolve, reject) => {
      let timeout;
      const proxyHandler = (id, proxy) => {
        this._logger.silly('Reached Proxy Handler, resolving');
        // clear the timeout interval
        clearTimeout(timeout);
        // reset the timeout
        timeout = null;
        // reset the ban flag
        this.shouldBanProxy = 0;
        // finally, resolve with the new proxy
        resolve(proxy);
      };
      timeout = setTimeout(() => {
        this._events.removeListener(Events.ReceiveProxy, proxyHandler);
        this._logger.silly('Reached Proxy Timeout: should reject? %s', !!timeout);
        // only reject if timeout has not been cleared
        if (timeout) {
          reject(new Error('Timeout'));
        }
      }, 10000); // TODO: Make this a variable delay?
      this._events.once(Events.ReceiveProxy, proxyHandler);
    });
  }

  // MARK: Event Registration
  registerForEvent(event, callback) {
    switch (event) {
      case Events.TaskStatus: {
        this._events.on(Events.TaskStatus, callback);
        break;
      }
      default:
        break;
    }
  }

  deregisterForEvent(event, callback) {
    switch (event) {
      case Events.TaskStatus: {
        this._events.removeListener(Events.TaskStatus, callback);
        break;
      }
      default: {
        break;
      }
    }
  }

  // MARK: Event Emitting
  _emitEvent(event, payload) {
    switch (event) {
      // Emit supported events on their specific channel
      case Events.TaskStatus: {
        this._events.emit(event, this._context.id, payload, event);
        break;
      }
      default: {
        break;
      }
    }
    this._logger.silly('Event %s emitted: %j', event, payload);
  }

  _emitTaskEvent(payload = {}) {
    if (payload.message && payload.message !== this._context.status) {
      this._context.status = payload.message;
      this._emitEvent(Events.TaskStatus, { ...payload, type: Types.Normal });
    }
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
        site: { url },
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
      const res = await this._request(`${url}/account/login`, {
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
        site: { url },
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
      let res = await this._request('https://elb.deposit.shopifycs.com/sessions', {
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

      res = await this._request('https://elb.deposit.shopifycs.com/sessions', {
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

  async _handleGetSiteData() {
    const {
      aborted,
      rawProxy,
      proxy,
      task: {
        site: { url },
        type,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._request(url, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'follow',
        headers: {
          'User-Agent': userAgent,
        },
      });

      const { status } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Getting site data',
          nextState: States.GET_SITE_DATA,
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
        this._context.task.site.apiKey = accessToken;
      }

      if (!accessToken) {
        // check the script location as well
        match = body.match(/"accessToken":(.*)","betas"/);

        if (!match || !match.length) {
          this._emitTaskEvent({ message: 'Invalid Shopify site', rawProxy });
          return States.ERROR;
        }
        [, accessToken] = match;
        this._context.task.site.apiKey = accessToken;
      }
      if (type === Modes.SAFE) {
        if (!this._needsLogin) {
          if (this._context.task.product.variants && this._context.task.product.variants.length) {
            this._emitTaskEvent({
              message: 'Adding to cart',
              rawProxy,
              apiKey: this._context.task.site.apiKey || undefined,
            });
            return States.ADD_TO_CART;
          }
          this._emitTaskEvent({
            message: 'Waiting for product',
            rawProxy,
            apiKey: this._context.task.site.apiKey || undefined,
          });
          return States.WAIT_FOR_PRODUCT;
        }
        this._emitTaskEvent({
          message: 'Logging in',
          rawProxy,
          apiKey: this._context.task.site.apiKey || undefined,
        });
        return States.LOGIN;
      }
      if (!this._needsLogin) {
        this._emitTaskEvent({
          message: 'Creating checkout',
          rawProxy,
          apiKey: this._context.task.site.apiKey || undefined,
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
        site: { url, apiKey },
      },
    } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._request(`/checkpoint`, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: getHeaders({ url, apiKey }),
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
            await this._request(redirectUrl, {
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

      if (this._checkpointForm.endsWith('&')) {
        this._checkpointForm = this._checkpointForm.slice(0, -1);
      }

      this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
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
        site: { url, apiKey },
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
      const res = await this._request(`/checkpoint`, {
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
            await this._request(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
              redirect: 'manual',
              follow: 0,
              headers: {
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
        site: { url, name, apiKey },
        type,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (/dsm sg|dsm jp|dsm uk/i.test(name)) {
      return this._handleCreateCheckoutWallets();
    }

    if (!/dsm us/i.test(name) && type === Modes.FAST) {
      return this._handleBackupCreateCheckout();
    }

    if (!this._cartForm.includes('checkout')) {
      this._cartForm += `checkout=Check+out`;
    }

    try {
      const res = await this._request(`${url}/cart`, {
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
            await this._request(redirectUrl, {
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
        site: { url, apiKey },
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
      const res = await this._request(`${url}/checkout`, {
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
            await this._request(redirectUrl, {
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
          this._emitTaskEvent({ message: 'Submitting information' });
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
        site: { url, apiKey },
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
      const res = await this._request(`${url}/wallets/checkouts`, {
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
            await this._request(redirectUrl, {
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
        site: { url },
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
      const res = await this._request(`${url}/checkout/poll?js_poll=1`, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'follow',
        follow: 5,
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

      const { status } = res;

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

      let { url: redirectUrl } = res;
      this._logger.debug('CHECKOUT: Queue response: %j \nBody: %j', status, body);
      if (status === 302) {
        if (!redirectUrl || /throttle/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Not through queue (${status})`, rawProxy });
          return States.QUEUE;
        }

        if (/_ctd/i.test(redirectUrl)) {
          try {
            const response = await this._request(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy,
              redirect: 'manual',
              headers: {
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
            const response = await this._request(`${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`, {
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

            const respBody = await response.text();
            this._logger.debug('QUEUE: 200 RESPONSE BODY: %j', respBody);

            const [, checkoutUrl] = respBody.match(/href="(.*)"/);
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
        site: { name, url },
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

    if (
      /dsm sg|dsm jp|dsm uk/i.test(name) ||
      (!/dsm us/i.test(this._context.task.site.name) && type === Modes.FAST)
    ) {
      return this._handleBackupAddToCart();
    }

    let variant;
    if (parseType !== ParseType.Variant) {
      variant = await pickVariant(variants, size, url, this._logger, randomInStock);
    } else {
      [variant] = variants;
    }

    if (!variant) {
      return {
        message: 'No size matched! Stopping...',
        nextState: States.ERROR,
      };
    }

    const { option, id } = variant;

    this._context.task.product.size = option;

    try {
      const res = await this._request('/cart/add.js', {
        method: 'POST',
        compress: true,
        agent: proxy,
        headers: {
          origin: url,
          host: `${url.split('/')[2]}`,
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent': userAgent,
          Accept: 'application/json,text/javascript,*/*;q=0.01',
          referer: restockUrl,
          'content-type': /eflash/i.test(url)
            ? 'application/x-www-form-urlencoded'
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
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
          return States.GO_TO_CHECKPOINT;
        }

        if (/stock_problems/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Adding to cart' });
          return States.ADD_TO_CART;
        }

        if (/password/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Password page', rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Adding to cart' });
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
            await this._request(redirectUrl, {
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

      if (/cannot find variant/i.test(body)) {
        this._emitTaskEvent({ message: `Variant not live, delaying ${monitorDelay}ms`, rawProxy });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Adding to cart' });
        return States.ADD_TO_CART;
      }

      const { price } = body;

      if (price) {
        this._prices.cart = price;
      }

      this._emitTaskEvent({ message: 'Going to cart', rawProxy });
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

  async _handleBackupAddToCart() {
    const {
      aborted,
      rawProxy,
      task: {
        site: { url, name, apiKey },
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
      return {
        message: 'No size matched! Stopping...',
        nextState: States.ERROR,
      };
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
      const res = await this._request(`/wallets/checkouts/${this._checkoutToken}.json`, {
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
          this._emitTaskEvent({ message: 'Adding to cart' });
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
            await this._request(redirectUrl, {
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
          this._emitTaskEvent({ message: 'Adding to cart' });
          return States.ADD_TO_CART;
        }
        if (error && error.variant_id && error.variant_id.length) {
          this._emitTaskEvent({
            message: `Variant not live! Delaying ${monitorDelay}ms`,
            rawProxy,
          });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Adding to cart' });
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
        site: { url, apiKey },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._request(`${url}/cart`, {
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
            await this._request(redirectUrl, {
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

  // TODO: trace this!
  async _handleRequestCaptcha() {
    const {
      aborted,
      task: { type },
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
            return States.PAYMENT_TOKEN;
          }
          return States.SUBMIT_SHIPPING;
        }

        // only happens in safe mode
        if (this._prevState === States.GO_TO_CART) {
          return States.LOGIN;
        }

        if (this._prevState === States.GO_TO_CHECKPOINT) {
          return States.SUBMIT_CHECKPOINT;
        }

        if (this._prevState === States.GO_TO_CHECKOUT) {
          if (type === Modes.FAST) {
            if (this._selectedShippingRate.id) {
              return States.PAYMENT_TOKEN;
            }
            return States.GO_TO_SHIPPING;
          }
          return States.SUBMIT_CUSTOMER;
        }

        if (this._prevState === States.SUBMIT_PAYMENT) {
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
        site: { url, name, apiKey },
        monitorDelay,
        forceCaptcha,
        type,
      },
      proxy,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (
      /dsm sg|dsm jp|dsm uk/i.test(name) ||
      (!/dsm us/i.test(this._context.task.site.name) && type === Modes.FAST)
    ) {
      return this._handleBackupGetCheckout();
    }

    try {
      const res = await this._request(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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
            await this._request(redirectUrl, {
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
      $('noscript').each((_, el) => {
        if (!$(el).attr('src')) {
          const iframe = $(el).find('iframe');
          if (iframe) {
            const src = iframe.attr('src');
            if (src && /recaptcha/i.test(src)) {
              const match = src.match(/\?k=(.*)/);
              if (match && match.length) {
                [, this._context.task.site.sitekey] = match;
              }
            }
          }
        }
      });

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
        site: { url, apiKey },
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
      const res = await this._request(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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
            await this._request(redirectUrl, {
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
        site: { url, apiKey, name },
        type,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (
      /dsm sg|dsm jp|dsm uk/i.test(name) ||
      (!/dsm us/i.test(this._context.task.site.name) && type === Modes.FAST)
    ) {
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
      const res = await this._request(`${url}/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'follow',
        follow: 1,
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

      const { status, url: redirectUrl } = res;

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

      const body = await res.text();
      const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

      if (/captcha validation failed/i.test(body)) {
        this._captchaToken = '';
        this._emitTaskEvent({ message: 'Captcha failed', rawProxy });
        return States.GO_TO_CHECKOUT;
      }

      if (match && match.length) {
        const [, step] = match;
        if (/stock_problems/i.test(step)) {
          this._emitTaskEvent({ message: `Out of stock, delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting information', rawProxy });
          return States.GO_TO_CHECKOUT;
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
      }

      // if we followed a redirect at some point...
      if (redirectUrl) {
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
            await this._request(redirectUrl, {
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
        site: { url, apiKey },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._request(`/wallets/checkouts/${this._checkoutToken}.json`, {
        method: 'PATCH',
        compress: true,
        agent: proxy,
        redirect: 'follow',
        follow: 1,
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
        },
        body: JSON.stringify(
          patchCheckoutForm(billingMatchesShipping, shipping, billing, payment, this._captchaToken),
        ),
      });

      const { status, url: redirectUrl } = res;

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
      if (res.redirected) {
        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._request(redirectUrl, {
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
        return { message, nextState: States.SUBMIT_CUSTOMER };
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
        site: { url, name, apiKey },
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

    if (
      /dsm sg|dsm jp|dsm uk/i.test(name) ||
      (!/dsm us/i.test(this._context.task.site.name) && type === Modes.FAST)
    ) {
      return this._handleBackupGetShipping();
    }

    try {
      const res = await this._request(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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

      const redirectUrl = headers.get('location');
      this._logger.silly(`CHECKOUT: Get shipping redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
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
            await this._request(redirectUrl, {
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
        site: { url, apiKey },
        forceCaptcha,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._request(
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
        site: { url, name, apiKey },
        type,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (
      /dsm sg|dsm jp|dsm uk/i.test(name) ||
      (!/dsm us/i.test(this._context.task.site.name) && type === Modes.FAST)
    ) {
      return this._handleBackupSubmitShipping();
    }

    try {
      const res = await this._request(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'follow',
        follow: 1,
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

      const { status, url: redirectUrl } = res;

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

      const body = await res.text();
      const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

      if (/recaptcha/i.test(body)) {
        this._emitTaskEvent({ message: 'Waiting for captcha', rawProxy });
        return States.CAPTCHA;
      }

      if (match && match.length) {
        const [, step] = match;

        if (/stock_problems/i.test(step)) {
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
          this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
          await this._delayer;
          this._emitTaskEvent({ message: 'Submitting shipping', rawProxy });
          return States.SUBMIT_SHIPPING;
        }

        if (/captcha validation failed/i.test(body)) {
          this._captchaToken = '';
          this._emitTaskEvent({ message: 'Captcha failed', rawProxy });
          return States.GO_TO_CHECKOUT;
        }

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
      }

      // if we followed a redirect at some point...
      if (res.redirected) {
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
            await this._request(redirectUrl, {
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
        site: { url, apiKey },
        forceCaptcha,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._request(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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

      const redirectUrl = headers.get('location');
      this._logger.silly(`CHECKOUT: Get payment redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
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
            await this._request(redirectUrl, {
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

      if (/stock_problems/i.test(body)) {
        // TODO: restock mode
        this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms`, rawProxy });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Submitting payment', rawProxy });
        return States.GO_TO_PAYMENT;
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
        site: { url, name, apiKey },
        type,
      },
    } = this._context;

    if (
      /dsm sg|dsm jp|dsm uk/i.test(name) ||
      (!/dsm us/i.test(this._context.task.site.name) && type === Modes.FAST)
    ) {
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
      const res = await this._request(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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
          await this._request(redirectUrl, {
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
        site: { url, apiKey },
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
      const res = await this._request(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
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

      // check if redirected
      if (redirectUrl) {
        if (/processing/i.test(redirectUrl)) {
          this._captchaToken = '';
          this._emitTaskEvent({ message: 'Processing payment', rawProxy });
          return States.PROCESS_PAYMENT;
        }

        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
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
            await this._request(redirectUrl, {
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

      return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
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
        site: { url, name, apiKey },
        type,
        forceCaptcha,
      },
    } = this._context;

    if (
      /dsm sg|dsm jp|dsm uk/i.test(name) ||
      (!/dsm us/i.test(this._context.task.site.name) && type === Modes.FAST)
    ) {
      return this._handleBackupCompletePayment();
    }

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._request(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'follow',
        follow: 5,
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

      const { status, url: redirectUrl } = res;

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
            await this._request(redirectUrl, {
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
            await this._request(redirectUrl, {
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
        site: { url, apiKey },
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
      const res = await this._request(`/${this._storeId}/checkouts/${this._checkoutToken}`, {
        method: 'PATCH',
        compress: true,
        agent: proxy,
        follow: 5,
        redirect: 'follow',
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify(form),
      });

      const { status, url: redirectUrl } = res;

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

      if (redirectUrl) {
        if (/processing/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Processing payment', rawProxy });
          return States.PROCESS_PAYMENT;
        }

        if (/checkpoint/i.test(redirectUrl)) {
          this._emitTaskEvent({ message: 'Going to checkpoint', rawProxy });
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
            await this._request(redirectUrl, {
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
            await this._request(redirectUrl, {
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
        site: { url, apiKey, name },
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
      const res = await this._request(`${url}/wallets/checkouts/${this._checkoutToken}/payments`, {
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

        const { currency, payment_due: paymentDue, web_url: webUrl } = payment.checkout;

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
            site: { name, url },
            order: {
              number: orderName,
              url: statusUrl,
            },
            profile: profileName,
            size,
            image: `${image}`.startsWith('http') ? image : `https:${image}`,
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
              site: { name, url },
              order: null,
              profile: profileName,
              size,
              image: `${image}`.startsWith('http') ? image : `https:${image}`,
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
                site: { name, url },
                order: null,
                profile: profileName,
                size,
                image: `${image}`.startsWith('http') ? image : `https:${image}`,
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
              site: { name, url },
              order: null,
              profile: profileName,
              size,
              image: `${image}`.startsWith('http') ? image : `https:${image}`,
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
        site: { url, apiKey },
      },
      proxy,
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._request(`${url}/${this._storeId}/checkouts/${this._checkoutToken}`, {
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

  async _handleSwapProxies() {
    const {
      task: { errorDelay },
    } = this._context;
    try {
      this._logger.silly('Waiting for new proxy...');
      const proxy = await this.swapProxies();

      this._logger.debug(
        'PROXY IN _handleSwapProxies: %j Should Ban?: %d',
        proxy,
        this.shouldBanProxy,
      );
      // Proxy is fine, update the references
      if (proxy || proxy === null) {
        if (proxy === null) {
          this.proxy = proxy; // null
          this._context.proxy = proxy; // null
          this._context.rawProxy = 'localhost';
          this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
          this._emitTaskEvent({
            message: `Swapped proxy to: localhost`,
            proxy,
          });
        } else {
          this.proxy = proxy;
          const p = proxy ? new HttpsProxyAgent(proxy.proxy) : null;

          if (p) {
            p.options.maxSockets = Infinity;
            p.options.maxFreeSockets = Infinity;
            p.options.keepAlive = true;
            p.maxFreeSockets = Infinity;
            p.maxSockets = Infinity;
          }
          this._context.proxy = p;
          this._context.rawProxy = proxy.raw;
          this.shouldBanProxy = 0; // reset ban flag
          this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
          this._emitTaskEvent({
            message: `Swapped proxy to: ${proxy.raw}`,
            proxy: proxy.raw,
          });
        }
        this._logger.debug('Rewinding to state: %s', this._prevState);
        return this._prevState;
      }

      this._emitTaskEvent({
        message: `No open proxy! Delaying ${errorDelay}ms`,
      });
      // If we get a null proxy back, there aren't any available. We should wait the error delay, then try again
      this._delayer = waitForDelay(errorDelay, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Proxy banned!' });
    } catch (err) {
      this._logger.verbose('Swap Proxies Handler completed with errors: %s', err, err);
      this._emitTaskEvent({
        message: 'Error swapping proxies! Retrying...',
      });
    }

    // Go back to previous state
    return this._prevState;
  }

  _generateEndStateHandler(state) {
    let status = 'stopped';
    switch (state) {
      case States.ABORT: {
        status = 'aborted';
        break;
      }
      case States.ERROR: {
        status = 'errored out';
        break;
      }
      case States.DONE: {
        status = 'finished';
        break;
      }
      default: {
        break;
      }
    }
    return () => {
      this._emitTaskEvent({
        message: this._context.status || `Task has ${status}`,
        done: true,
      });
      return States.DONE;
    };
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
      [States.SWAP]: this._handleSwapProxies,
      [States.DONE]: this._generateEndStateHandler(States.DONE),
      [States.ERROR]: this._generateEndStateHandler(States.ERROR),
      [States.ABORT]: this._generateEndStateHandler(States.ABORT),
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }

  // MARK: State Machine Run Loop

  async run() {
    let nextState = this._state;

    if (this._context.aborted) {
      nextState = States.ABORT;
    }

    try {
      nextState = await this._handleStepLogic(this._state);
    } catch (e) {
      if (!/aborterror/i.test(e.name)) {
        this._logger.verbose('Run loop errored out! %s', e);
        nextState = States.ERROR;
        return true;
      }
    }

    if (this._state !== nextState) {
      this._history.push(this._state);
      this._prevState = this._state;
      this._state = nextState;
    }

    // overwrite nextState if we're deregistering proxy
    if (this._deregisterOverride) {
      this._state = States.SWAP;
      this._deregisterOverride = false;
    }

    this._logger.silly('Run Loop finished, state transitioned to: %s', this._state);

    if (nextState === States.ABORT) {
      return true;
    }

    return false;
  }

  async start() {
    this._prevState = States.STARTED;

    let shouldStop = false;
    while (this._state !== States.DONE && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.run();
    }

    this._cleanup();
  }
}

TaskRunnerPrimitive.Events = Events;
TaskRunnerPrimitive.States = States;

module.exports = TaskRunnerPrimitive;
