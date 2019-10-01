import { isEqual } from 'lodash';
import HttpsProxyAgent from 'https-proxy-agent';
import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

const Timer = require('../../common/timer');
const Discord = require('../classes/hooks/discord');
const Slack = require('../classes/hooks/slack');
const AsyncQueue = require('../../common/asyncQueue');
const { Events } = require('../../constants').Runner;
const {
  TaskRunner: { States, Types, DelayTypes, HookTypes, StateMap, HarvestStates },
  Monitor: { ParseType },
} = require('../classes/utils/constants');
const TaskManagerEvents = require('../../constants').Manager.Events;
const { waitForDelay } = require('../../common');
const { getCheckoutMethod } = require('../classes/checkouts');
const { Modes } = require('../classes/utils/constants').TaskRunner;

class TaskRunner {
  get state() {
    return this._state;
  }

  constructor(context, proxy, type) {
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
      timeout: 120000, // to be overridden as necessary
      signal: this._aborter.signal, // generic abort signal
    });
    this._parseType = type;

    this._delayer = null;
    this._captchaQueue = null;

    this._timers = {
      checkout: new Timer(),
      monitor: new Timer(),
    };
    this._discord = new Discord(this._task.discord);
    this._slack = new Slack(this._task.slack);
    this._logger = context.logger;

    /**
     * The context of this task runner
     *
     * This is a wrapper that contains all data about the task runner.
     * @type {TaskRunnerContext}
     */
    this._context = {
      ...context,
      proxy: proxy ? new HttpsProxyAgent(proxy.proxy) : null,
      rawProxy: proxy ? proxy.raw : null,
      parseType: this._parseType,
      aborter: this._aborter,
      delayer: this._delayer,
      signal: this._aborter.signal,
      request: this._request,
      jar: context.jar,
      timers: this._timers,
      discord: this._discord,
      slack: this._slack,
      logger: this._logger,
      harvestState: HarvestStates.idle,
    };

    this.needsLogin = this._context.task.account || false;
    this._state = States.STARTED;

    // decide what our start state should be!
    if (!this._context.task.site.apiKey) {
      this._state = States.GET_SITE_DATA;
    } else if (this.needsLogin) {
      this._state = States.LOGIN;
    } else if (
      /dsm uk|dsm jp|dsm sg/i.test(this._context.task.site.name) ||
      this._context.task.type === Modes.FAST
    ) {
      this._state = States.CREATE_CHECKOUT;
    } else {
      this._state = States.WAIT_FOR_PRODUCT;
    }

    /**
     * Create a new checkout object to be used for this task
     */
    const CheckoutCreator = getCheckoutMethod(
      this._context.task.site,
      this._context.task.type,
      this._logger,
    );
    this._checkout = CheckoutCreator({
      ...this._context,
      getCaptcha: this.getCaptcha.bind(this),
      stopHarvestCaptcha: this.stopHarvestCaptcha.bind(this),
      suspendHarvestCaptcha: this.suspendHarvestCaptcha.bind(this),
    });

    this._history = [];

    this._handleAbort = this._handleAbort.bind(this);
    this._handleDelay = this._handleDelay.bind(this);
    this._handleProduct = this._handleProduct.bind(this);

    this._events.on(TaskManagerEvents.ChangeDelay, this._handleDelay, this);
    this._events.on(TaskManagerEvents.UpdateHook, this._handleUpdateHooks, this);
    this._events.on(TaskManagerEvents.ProductFound, this._handleProduct, this);
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
      this._checkout.needsCaptcha = false;
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
        return product.url.toUpperCase() === url.toUpperCase();
      }
      default:
        return false;
    }
  }

  async _handleProduct(id, product, parseType) {
    if (parseType === this._parseType) {
      const isSameProductData = await this._compareProductInput(product, parseType);

      if (
        (isSameProductData && !this._context.productFound) ||
        (id === this.id && !this._context.productFound)
      ) {
        this._context.task.product = {
          ...this._context.task.product,
          ...product,
        };
        // patch checkout context
        this._checkout._context.task.product = this._context.task.product;
        this._context.productFound = true;
      }
    }
  }

  _handleDelay(id, delay, type) {
    if (id === this._context.id) {
      if (type === DelayTypes.error) {
        this._context.task.errorDelay = delay;
        this._checkout._context.task.errorDelay = delay;
      } else if (type === DelayTypes.monitor) {
        this._context.task.monitorDelay = delay;
        this._checkout._context.task.monitorDelay = delay;
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
      this._events.emit(TaskManagerEvents.StartHarvest, this._context.id);
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

  // MARK: State Machine Step Logic

  async _handleLogin() {
    const {
      aborted,
      rawProxy,
      task: { monitorDelay },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.login();

    this._emitTaskEvent({ message, proxy: rawProxy });

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
    }

    return nextState;
  }

  async _handlePaymentToken() {
    const {
      aborted,
      rawProxy,
      task: { monitorDelay },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.getPaymentToken();

    this._emitTaskEvent({ message, proxy: rawProxy });

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
    }

    if (nextState) {
      return nextState;
    }

    return States.SUBMIT_PAYMENT;
  }

  async _handleGetSiteData() {
    const {
      aborted,
      rawProxy,
      task: { monitorDelay },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.getSiteData();

    this._emitTaskEvent({
      message,
      apiKey: this._context.task.site.apiKey || undefined,
      proxy: rawProxy,
    });

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
    }

    return nextState;
  }

  async _handleGetCheckpoint() {
    const {
      aborted,
      rawProxy,
      task: { monitorDelay },
    } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.getCheckpoint();

    this._emitTaskEvent({ message, proxy: rawProxy });

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Going to checkpoint' });
    }

    return nextState;
  }

  async _handleSubmitCheckpoint() {
    const {
      aborted,
      rawProxy,
      task: { monitorDelay },
    } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.submitCheckpoint();

    this._emitTaskEvent({ message, proxy: rawProxy });

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Submitting checkpoint' });
    }

    return nextState;
  }

  async _handleCreateCheckout() {
    const {
      aborted,
      rawProxy,
      task: { monitorDelay },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.createCheckout();

    this._emitTaskEvent({ message, proxy: rawProxy });

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Creating checkout' });
    }

    return nextState;
  }

  async _handlePollQueue() {
    const {
      aborted,
      rawProxy,
      task: { type },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let message;
    let delay;
    let shouldBan;
    let nextState;

    // eslint-disable-next-line prefer-const
    ({ message, delay, shouldBan, nextState } = await this._checkout.pollQueue());

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    this._emitTaskEvent({ message: 'Polling queue', proxy: rawProxy });

    if (delay) {
      this._delayer = waitForDelay(5000, this._aborter.signal);
      await this._delayer;
    }

    if (nextState) {
      this._emitTaskEvent({ message, proxy: rawProxy });
      return nextState;
    }

    // poll queue map should be used to determine where to go next
    ({ message, delay, nextState } = StateMap[this._prevState](
      type,
      this._context.task,
      this._checkout.chosenShippingMethod,
    ));
    this._emitTaskEvent({ message, proxy: rawProxy });
    return nextState;
  }

  async _handleWaitForProduct() {
    const { aborted } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._context.productFound) {
      return States.ADD_TO_CART;
    }

    this._delayer = waitForDelay(500, this._aborter.signal);
    await this._delayer;

    return States.WAIT_FOR_PRODUCT;
  }

  async _handleAddToCart() {
    const {
      aborted,
      rawProxy,
      task: { monitorDelay },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.addToCart();

    const { size } = this._context.task.product;

    this._emitTaskEvent({ message, proxy: rawProxy, size });

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Checking stock', proxy: rawProxy });
    }

    return nextState;
  }

  async _handleGoToCart() {
    const {
      aborted,
      rawProxy,
      task: { monitorDelay },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.getCart();

    this._emitTaskEvent({ message, proxy: rawProxy });

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
    }

    return nextState;
  }

  async _handleRequestCaptcha() {
    const {
      aborted,
      task: { type },
    } = this._context;
    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      if (this._checkout.captchaTokenRequest) {
        // cancel the request if it was previously started
        this._checkout.captchaTokenRequest.cancel('aborted');
      }
      return States.ABORT;
    }

    // start request if it hasn't started already
    if (!this._checkout.captchaTokenRequest) {
      this._checkout.captchaTokenRequest = await this.getCaptcha();
    }

    // Check the status of the request
    switch (this._checkout.captchaTokenRequest.status) {
      case 'pending': {
        // waiting for token, sleep for delay and then return same state to check again
        await new Promise(resolve => setTimeout(resolve, 2000));
        return States.CAPTCHA;
      }
      case 'fulfilled': {
        // token was returned, store it and remove the request
        ({ value: this._checkout.captchaToken } = this._checkout.captchaTokenRequest);
        this._checkout.captchaTokenRequest = null;
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
            if (this._checkout.chosenShippingMethod.id) {
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
          this._checkout.captchaTokenRequest.status,
        );
        // clear out the status so we get a generic "errored out task event"
        this._context.status = null;
        return States.ERROR;
      }
      default: {
        this._logger.silly(
          'Unknown Harvest Captcha status! %s, stopping...',
          this._checkout.captchaTokenRequest.status,
        );
        // clear out the status so we get a generic "errored out task event"
        this._context.status = null;
        return States.ERROR;
      }
    }
  }

  async _handleGoToCheckout() {
    const {
      aborted,
      rawProxy,
      task: {
        site: { url, name },
        monitorDelay,
        type,
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let message;
    let delay;
    let shouldBan;
    let nextState;
    if (type === Modes.SAFE) {
      if (/dsm sg|dsm jp|dsm uk/i.test(name)) {
        ({ message, delay, shouldBan, nextState } = await this._checkout.goToCheckout());
      } else {
        ({ message, delay, shouldBan, nextState } = await this._checkout.getCheckout(
          this._state,
          'Going to checkout',
          'contact_information',
          'contact_information',
        ));
      }
    } else {
      ({ message, delay, shouldBan, nextState } = await this._checkout.getCheckout());
    }

    let checkoutUrl;

    const { storeId, checkoutToken, checkoutKey } = this._checkout;
    if (storeId && checkoutToken && checkoutKey) {
      checkoutUrl = `${url}/${storeId}/checkouts/${checkoutToken}?key=${checkoutKey}`;
    }

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!`, proxy: rawProxy, checkoutUrl });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    this._emitTaskEvent({
      message,
      proxy: rawProxy,
      checkoutUrl,
    });

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;

      switch (nextState) {
        case States.GO_TO_CHECKOUT: {
          this._emitTaskEvent({ message: 'Submitting information' });
          break;
        }
        case States.GO_TO_SHIPPING: {
          this._emitTaskEvent({ message: 'Submitting shipping' });
          break;
        }
        case States.GO_TO_PAYMENT: {
          this._emitTaskEvent({ message: 'Submitting payment' });
          break;
        }
        default: {
          break;
        }
      }
    }

    return nextState;
  }

  async _handleSubmitCustomer() {
    const {
      aborted,
      rawProxy,
      task: {
        monitorDelay,
        site: { url },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.submitCustomer();

    let checkoutUrl;

    const { storeId, checkoutToken, checkoutKey } = this._checkout;
    if (storeId && checkoutToken && checkoutKey) {
      checkoutUrl = `${url}/${storeId}/checkouts/${checkoutToken}?key=${checkoutKey}`;
    }

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    this._emitTaskEvent({ message, proxy: rawProxy, checkoutUrl });

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;

      switch (nextState) {
        case States.GO_TO_CHECKOUT: {
          this._emitTaskEvent({ message: 'Submitting information' });
          break;
        }
        case States.GO_TO_SHIPPING: {
          this._emitTaskEvent({ message: 'Submitting shipping' });
          break;
        }
        case States.GO_TO_PAYMENT: {
          this._emitTaskEvent({ message: 'Submitting payment' });
          break;
        }
        default: {
          break;
        }
      }
    }

    return nextState;
  }

  async _handleGoToShipping() {
    const {
      aborted,
      rawProxy,
      task: {
        monitorDelay,
        site: { url, name },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    let message;
    let delay;
    let shouldBan;
    let nextState;
    if (this._context.task.type === Modes.SAFE && !/dsm sg|dsm jp|dsm uk/i.test(name)) {
      ({ message, delay, shouldBan, nextState } = await this._checkout.getCheckout(
        this._state,
        'Fetching shipping rates',
        'shipping_method',
        'contact_information',
      ));
    } else {
      ({ message, delay, shouldBan, nextState } = await this._checkout.shippingRates());
    }

    let checkoutUrl;

    const { storeId, checkoutToken, checkoutKey } = this._checkout;
    if (storeId && checkoutToken && checkoutKey) {
      checkoutUrl = `${url}/${storeId}/checkouts/${checkoutToken}?key=${checkoutKey}`;
    }

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!`, proxy: rawProxy, checkoutUrl });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    this._emitTaskEvent({ message, proxy: rawProxy, checkoutUrl });

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;

      switch (nextState) {
        case States.GO_TO_CHECKOUT: {
          this._emitTaskEvent({ message: 'Submitting information' });
          break;
        }
        case States.GO_TO_SHIPPING: {
          this._emitTaskEvent({ message: 'Submitting shipping' });
          break;
        }
        case States.GO_TO_PAYMENT: {
          this._emitTaskEvent({ message: 'Submitting payment' });
          break;
        }
        default: {
          break;
        }
      }
    }

    return nextState;
  }

  async _handleSubmitShipping() {
    const {
      aborted,
      rawProxy,
      task: {
        monitorDelay,
        site: { url },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.submitShipping();

    let checkoutUrl;

    const { storeId, checkoutToken, checkoutKey } = this._checkout;
    if (storeId && checkoutToken && checkoutKey) {
      checkoutUrl = `${url}/${storeId}/checkouts/${checkoutToken}?key=${checkoutKey}`;
    }

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!`, proxy: rawProxy, checkoutUrl });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    this._emitTaskEvent({ message, proxy: rawProxy, checkoutUrl });

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;

      switch (nextState) {
        case States.GO_TO_CHECKOUT: {
          this._emitTaskEvent({ message: 'Submitting information' });
          break;
        }
        case States.GO_TO_SHIPPING: {
          this._emitTaskEvent({ message: 'Submitting shipping' });
          break;
        }
        case States.GO_TO_PAYMENT: {
          this._emitTaskEvent({ message: 'Submitting payment' });
          break;
        }
        default: {
          break;
        }
      }
    }

    return nextState;
  }

  async _handleGoToPayment() {
    const {
      aborted,
      rawProxy,
      task: {
        monitorDelay,
        site: { url },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.getCheckout(
      this._state,
      'Submitting payment',
      'payment_method',
      'shipping_method',
    );

    let checkoutUrl;

    const { storeId, checkoutToken, checkoutKey } = this._checkout;
    if (storeId && checkoutToken && checkoutKey) {
      checkoutUrl = `${url}/${storeId}/checkouts/${checkoutToken}?key=${checkoutKey}`;
    }

    this._context.timers.checkout.start();

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!`, proxy: rawProxy, checkoutUrl });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    this._emitTaskEvent({ message, proxy: rawProxy, checkoutUrl });

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;

      switch (nextState) {
        case States.GO_TO_CHECKOUT: {
          this._emitTaskEvent({ message: 'Submitting information' });
          break;
        }
        case States.GO_TO_SHIPPING: {
          this._emitTaskEvent({ message: 'Submitting shipping' });
          break;
        }
        case States.GO_TO_PAYMENT: {
          this._emitTaskEvent({ message: 'Submitting payment' });
          break;
        }
        default: {
          break;
        }
      }
    }

    return nextState;
  }

  async _handleSubmitPayment() {
    const {
      aborted,
      rawProxy,
      task: {
        monitorDelay,
        site: { url },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.submitPayment();

    let checkoutUrl;

    const { storeId, checkoutToken, checkoutKey } = this._checkout;
    if (storeId && checkoutToken && checkoutKey) {
      checkoutUrl = `${url}/${storeId}/checkouts/${checkoutToken}?key=${checkoutKey}`;
    }

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!`, proxy: rawProxy, checkoutUrl });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    this._emitTaskEvent({ message, proxy: rawProxy, checkoutUrl });

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;

      switch (nextState) {
        case States.GO_TO_CHECKOUT: {
          this._emitTaskEvent({ message: 'Submitting information' });
          break;
        }
        case States.GO_TO_SHIPPING: {
          this._emitTaskEvent({ message: 'Submitting shipping' });
          break;
        }
        case States.GO_TO_PAYMENT: {
          this._emitTaskEvent({ message: 'Submitting payment' });
          break;
        }
        default: {
          break;
        }
      }
    }

    return nextState;
  }

  async _handleGoToReview() {
    const {
      aborted,
      rawProxy,
      task: {
        monitorDelay,
        site: { url },
      },
    } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.getCheckout(
      this._state,
      'Completing payment',
      'review',
      'payment_method',
    );

    let checkoutUrl;

    const { storeId, checkoutToken, checkoutKey } = this._checkout;
    if (storeId && checkoutToken && checkoutKey) {
      checkoutUrl = `${url}/${storeId}/checkouts/${checkoutToken}?key=${checkoutKey}`;
    }

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!`, proxy: rawProxy, checkoutUrl });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    this._emitTaskEvent({ message, proxy: rawProxy, checkoutUrl });

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;

      switch (nextState) {
        case States.GO_TO_CHECKOUT: {
          this._emitTaskEvent({ message: 'Submitting information' });
          break;
        }
        case States.GO_TO_SHIPPING: {
          this._emitTaskEvent({ message: 'Submitting shipping' });
          break;
        }
        case States.GO_TO_PAYMENT: {
          this._emitTaskEvent({ message: 'Submitting payment' });
          break;
        }
        default: {
          break;
        }
      }
    }

    return nextState;
  }

  async _handleCompletePayment() {
    const {
      aborted,
      rawProxy,
      task: {
        monitorDelay,
        site: { url },
      },
    } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { message, delay, shouldBan, nextState } = await this._checkout.completePayment();

    let checkoutUrl;

    const { storeId, checkoutToken, checkoutKey } = this._checkout;
    if (storeId && checkoutToken && checkoutKey) {
      checkoutUrl = `${url}/${storeId}/checkouts/${checkoutToken}?key=${checkoutKey}`;
    }

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!`, proxy: rawProxy, checkoutUrl });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    this._emitTaskEvent({ message, proxy: rawProxy, checkoutUrl });

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;

      switch (nextState) {
        case States.GO_TO_CHECKOUT: {
          this._emitTaskEvent({ message: 'Submitting information' });
          break;
        }
        case States.GO_TO_SHIPPING: {
          this._emitTaskEvent({ message: 'Submitting shipping' });
          break;
        }
        case States.GO_TO_PAYMENT: {
          this._emitTaskEvent({ message: 'Submitting payment' });
          break;
        }
        default: {
          break;
        }
      }
    }

    return nextState;
  }

  async _handlePaymentProcess() {
    const { aborted, rawProxy } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const {
      message,
      delay,
      shouldBan,
      order,
      status,
      nextState,
    } = await this._checkout.paymentProcessing();

    this._emitTaskEvent({ message, order, status, proxy: rawProxy });

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(1000, this._aborter.signal);
      await this._delayer;
    }

    return nextState;
  }

  async _handleBackupProcessPayment() {
    const { aborted, rawProxy } = this._context;

    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const {
      message,
      delay,
      shouldBan,
      order,
      nextState,
    } = await this._checkout.backupPaymentProcessing();

    this._emitTaskEvent({ message, order, proxy: rawProxy });

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(1000, this._aborter.signal);
      await this._delayer;
    }

    return nextState;
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
          this._checkout._context.proxy = proxy; // null
          this._context.rawProxy = 'localhost';
          this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
          this._emitTaskEvent({
            message: `Swapped proxy to: localhost`,
            proxy,
          });
        } else {
          this.proxy = proxy;
          this._context.proxy = new HttpsProxyAgent(proxy.proxy);
          this._checkout._context.proxy = new HttpsProxyAgent(proxy.proxy);
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
      return States.STOP;
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
      [States.GO_TO_CHECKOUT]: this._handleGoToCheckout,
      [States.CAPTCHA]: this._handleRequestCaptcha,
      [States.SUBMIT_CUSTOMER]: this._handleSubmitCustomer,
      [States.GO_TO_SHIPPING]: this._handleGoToShipping,
      [States.SUBMIT_SHIPPING]: this._handleSubmitShipping,
      [States.GO_TO_PAYMENT]: this._handleGoToPayment,
      [States.SUBMIT_PAYMENT]: this._handleSubmitPayment,
      [States.GO_TO_REVIEW]: this._handleGoToReview,
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
    this._logger.silly('Run Loop finished, state transitioned to: %s', nextState);

    if (this._state !== nextState) {
      this._history.push(this._state);
      this._prevState = this._state;
      this._state = nextState;
    }

    if (nextState === States.ABORT) {
      return true;
    }

    return false;
  }

  async start() {
    this._prevState = States.STARTED;

    let shouldStop = false;
    while (this._state !== States.STOP && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.run();
    }

    this._cleanup();
  }
}

TaskRunner.Events = Events;
TaskRunner.States = States;

module.exports = TaskRunner;
