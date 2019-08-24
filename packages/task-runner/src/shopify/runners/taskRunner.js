import EventEmitter from 'eventemitter3';
import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';
import { CookieJar } from 'tough-cookie';

const Timer = require('../classes/timer');
const Monitor = require('../classes/monitor');
const RestockMonitor = require('../classes/restockMonitor');
const Discord = require('../classes/hooks/discord');
const Slack = require('../classes/hooks/slack');
const AsyncQueue = require('../../common/asyncQueue');
const {
  ErrorCodes,
  TaskRunner: { States, Events, Types, DelayTypes, HookTypes, StateMap, HarvestStates },
} = require('../classes/utils/constants');
const TaskManagerEvents = require('../classes/utils/constants').TaskManager.Events;
const { createLogger } = require('../../common/logger');
const { waitForDelay } = require('../classes/utils');
const { getCheckoutMethod } = require('../classes/checkouts');
const { Modes } = require('../classes/utils/constants').TaskRunner;

class TaskRunner {
  get state() {
    return this._state;
  }

  constructor(id, task, proxy, loggerPath, type = Types.Normal) {
    // Add Ids to object
    this.id = id;
    this.taskId = task.id;
    this.proxy = proxy;
    this._type = type;

    this._delayer = null;
    this._aborter = new AbortController();
    this._jar = new CookieJar();

    /**
     * Create a new event emitter to handle all IPC communication
     *
     * Events will provide the task id, a message, and a message group
     */
    this._events = new EventEmitter();

    // eslint-disable-next-line global-require
    const request = require('fetch-cookie')(fetch, this._jar);
    this._request = defaults(request, task.site.url, {
      timeout: 60000, // to be overridden as necessary
      signal: this._aborter.signal, // generic abort signal
    });

    /**
     * Logger Instance
     */
    this._logger = createLogger({
      dir: loggerPath,
      name: `TaskRunner-${id}`,
      prefix: `runner-${id}`,
    });

    /**
     * Internal Task Runner State
     */
    this._state = States.PAYMENT_TOKEN;

    this._captchaQueue = null;
    this._timers = {
      checkout: new Timer(),
      monitor: new Timer(),
    };
    this._discord = new Discord(task.discord);
    this._slack = new Slack(task.slack);

    this._history = [];

    /**
     * The context of this task runner
     *
     * This is a wrapper that contains all data about the task runner.
     * @type {TaskRunnerContext}
     */
    this._context = {
      id,
      type,
      task,
      status: null,
      proxy: proxy ? proxy.proxy : null,
      rawProxy: proxy ? proxy.raw : null,
      aborter: this._aborter,
      delayer: this._delayer,
      events: this._events,
      signal: this._aborter.signal,
      request: this._request,
      jar: this._jar,
      timers: this._timers,
      discord: this._discord,
      slack: this._slack,
      logger: this._logger,
      aborted: false,
      harvestState: HarvestStates.idle,
    };

    /**
     * Create a new monitor object to be used for the task
     */
    this._monitor = new Monitor(this._context);

    /**
     * Create a new restock monitor object to be used for task product restocking
     */
    this._restockMonitor = new RestockMonitor(this._context);

    /**
     * Create a new checkout object to be used for this task
     */
    const CheckoutCreator = getCheckoutMethod(
      this._context.task.site,
      this._context.task.type,
      this._logger,
    );
    [this._checkoutType, this._checkout] = CheckoutCreator({
      ...this._context,
      getCaptcha: this.getCaptcha.bind(this),
      stopHarvestCaptcha: this.stopHarvestCaptcha.bind(this),
      suspendHarvestCaptcha: this.suspendHarvestCaptcha.bind(this),
    });

    // Add in the checkout type once we create the checkout module
    this._checkout._checkoutType = this._checkoutType;

    this._handleAbort = this._handleAbort.bind(this);

    this._events.on(TaskManagerEvents.ChangeDelay, this._handleDelay, this);
    this._events.on(TaskManagerEvents.UpdateHook, this._handleUpdateHooks, this);
  }

  _handleAbort(id) {
    if (id === this._context.id) {
      this._context.aborted = true;
      this._aborter.abort();
      if (this._delayer) {
        this._delayer.clear();
      }
      this._monitor.aborter.abort();
    }
  }

  _handleHarvest(id, token) {
    if (id === this._context.id && this._captchaQueue) {
      this._captchaQueue.insert(token);
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

  /**
   * Propagates to change the appropriate hook
   * @param {String} id
   * @param {String} hook
   * @param {String} type
   */
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
    this._events.emit(Events.SwapProxy, this.id, this.proxy, this.shouldBanProxy);
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
      this._emitEvent(Events.TaskStatus, { ...payload, type: this._type });
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

    return nextState;
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
    ({ message, delay, nextState } = StateMap[this._prevState](type, this._context.task));
    this._emitTaskEvent({ message, proxy: rawProxy });
    return nextState;
  }

  async _handleMonitor() {
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

    const { message, delay, shouldBan, nextState } = await this._monitor.run();

    // if (this._context.timers.monitor.getRunTime() > CheckoutRefresh) {
    //   this._emitTaskEvent({ message: 'Refreshing checkout', proxy: rawProxy });
    //   return States.GO_TO_CHECKOUT;
    // }

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    const { chosenSizes, name } = this._context.task.product;

    this._emitTaskEvent({
      message,
      size: chosenSizes ? chosenSizes[0] : undefined,
      found: name || undefined,
      proxy: rawProxy,
    });

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
      this._emitTaskEvent({ message: 'Parsing products', proxy: rawProxy });
    }

    // Monitor will be in charge of choosing the next state
    return nextState;
  }

  async _handleRestocking() {
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

    // if (this._context.timers.monitor.getRunTime() > CheckoutRefresh) {
    //   this._emitTaskEvent({ message: 'Refreshing checkout', proxy: rawProxy });
    //   return States.GO_TO_CHECKOUT;
    // }

    let res;
    try {
      res = await this._restockMonitor.run();
    } catch (err) {
      if (err.code === ErrorCodes.RestockingNotSupported) {
        // If restock monitoring is not supported, go straight to ATC
        return States.ADD_TO_CART;
      }
    }

    const { message, delay, nextState, shouldBan } = res;

    const { chosenSizes, name } = this._context.task.product;

    this._emitTaskEvent({
      message,
      size: chosenSizes ? chosenSizes[0] : undefined,
      found: name || undefined,
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
      this._emitTaskEvent({ message: 'Checking stock', rawProxy });
    }
    // Restock Monitor will be in charge of choosing the next state
    return nextState;
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

    this._emitTaskEvent({ message, proxy: rawProxy });

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

        if (this._prevState === States.GO_TO_CHECKOUT) {
          if (type === Modes.FAST) {
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
        site: { url },
        monitorDelay,
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
    if (this._context.task.type === Modes.SAFE) {
      ({ message, delay, shouldBan, nextState } = await this._checkout.getCheckout(
        this._state,
        'Going to checkout',
        'contact_information',
        'contact_information',
      ));
    } else {
      ({ message, delay, shouldBan, nextState } = await this._checkout.getCheckout());
    }

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

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
    }

    this._emitTaskEvent({
      message,
      proxy: rawProxy,
      checkoutUrl,
    });

    return nextState;
  }

  async _handleSubmitCustomer() {
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

    const { message, delay, shouldBan, nextState } = await this._checkout.submitCustomer();

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

  async _handleGoToShipping() {
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

    let message;
    let delay;
    let shouldBan;
    let nextState;
    if (this._context.task.type === Modes.SAFE) {
      ({ message, delay, shouldBan, nextState } = await this._checkout.getCheckout(
        this._state,
        'Fetching shipping rates',
        'shipping_method',
        'contact_information',
      ));
    } else {
      ({ message, delay, shouldBan, nextState } = await this._checkout.shippingRates());
    }

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
    }

    this._emitTaskEvent({ message, proxy: rawProxy });

    return nextState;
  }

  async _handleSubmitShipping() {
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

    const { message, delay, shouldBan, nextState } = await this._checkout.submitShipping();

    if (nextState === States.SWAP) {
      this._emitTaskEvent({ message: `Proxy banned!` });
      this.shouldBanProxy = shouldBan; // Set a flag to ban the proxy if necessary
      return nextState;
    }

    if (delay) {
      this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
      await this._delayer;
    }

    this._emitTaskEvent({ message, proxy: rawProxy });

    return nextState;
  }

  async _handleGoToPayment() {
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

    const { message, delay, shouldBan, nextState } = await this._checkout.getCheckout(
      this._state,
      'Submitting payment',
      'payment_method',
      'shipping_method',
    );

    this._context.timers.checkout.start();

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

  async _handleSubmitPayment() {
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

    const { message, delay, shouldBan, nextState } = await this._checkout.submitPayment();

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

  async _handleGoToReview() {
    const {
      aborted,
      rawProxy,
      task: { monitorDelay },
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

  async _handleCompletePayment() {
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

    const { message, delay, shouldBan, nextState } = await this._checkout.completePayment();

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
      nextState,
    } = await this._checkout.paymentProcessing();

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
      if (proxy) {
        this.proxy = proxy;
        this._context.proxy = proxy.proxy;
        this._context.rawProxy = proxy.raw;
        this._checkout.context.proxy = proxy.proxy;
        this.shouldBanProxy = 0; // reset ban flag
        this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
        this._emitTaskEvent({
          message: `Swapped proxy to: ${proxy.raw}`,
          proxy: proxy.raw,
        });
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
      [States.QUEUE]: this._handlePollQueue,
      [States.MONITOR]: this._handleMonitor,
      [States.RESTOCK]: this._handleRestocking,
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
      [States.SWAP]: this._handleSwapProxies,
      [States.DONE]: this._generateEndStateHandler(States.DONE),
      [States.ERROR]: this._generateEndStateHandler(States.ERROR),
      [States.ABORT]: this._generateEndStateHandler(States.ABORT),
    };
    this._history.push(currentState);
    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }

  // MARK: State Machine Run Loop

  async runSingleLoop() {
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
    if (this._context.task.isQueueBypass && this._context.task.checkoutUrl) {
      this._state = States.MONITOR;
    }

    let shouldStop = false;
    while (this._state !== States.STOP && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.runSingleLoop();
    }

    this._cleanup();
  }
}

TaskRunner.Events = Events;
TaskRunner.States = States;

module.exports = TaskRunner;
