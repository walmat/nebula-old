/* eslint-disable class-methods-use-this */
const EventEmitter = require('events');
const request = require('request-promise');

const Timer = require('./classes/timer');
const Monitor = require('./classes/monitor');
const Checkout = require('./classes/checkout');
const AsyncQueue = require('./classes/asyncQueue');
const { States, Events } = require('./classes/utils/constants').TaskRunner;
const TaskManagerEvents = require('./classes/utils/constants').TaskManager.Events;
const { CheckoutErrorCodes } = require('./classes/utils/constants').ErrorCodes;
const { createLogger } = require('../common/logger');
const { waitForDelay, reflect, now } = require('./classes/utils');

class TaskRunner {
  get state() {
    return this._state;
  }

  constructor(id, task, proxy, loggerPath) {
    // Add Ids to object
    this.taskId = task.id;
    this.id = id;
    this.proxy = proxy;

    this._jar = request.jar();
    this._request = request.defaults({
      timeout: 50000,
      jar: this._jar,
    });

    /**
     * Logger Instance
     */
    this._logger = createLogger({
      dir: loggerPath,
      name: `TaskRunner-${id}`,
      filename: `runner-${id}.log`,
    });

    /**
     * Internal Task Runner State
     */
    this._state = States.Started;

    this._captchaQueue = null;
    this._isSetup = false;

    this._timer = new Timer();

    /**
     * The context of this task runner
     *
     * This is a wrapper that contains all data about the task runner.
     * @type {TaskRunnerContext}
     */
    this._context = {
      id,
      task,
      proxy: proxy ? proxy.proxy : null,
      request: this._request,
      setup: this._isSetup,
      timer: this._timer,
      logger: this._logger,
      aborted: false,
    };

    /**
     * Create a new monitor object to be used for the task
     */
    this._monitor = new Monitor(this._context);

    /**
     * Create a new checkout object to be used for this task
     */
    this._checkout = new Checkout({
      ...this._context,
      getCaptcha: this.getCaptcha.bind(this),
      stopHarvestCaptcha: this.stopHarvestCaptcha.bind(this),
    });

    /**
     * Create a new event emitter to handle all IPC communication
     *
     * Events will provide the task id, a message, and a message group
     */
    this._events = new EventEmitter();

    this._handleAbort = this._handleAbort.bind(this);
    this._handleHarvest = this._handleHarvest.bind(this);

    this._events.on(Events.ReceiveMonitorDelay, this._handleMonitorDelay);
  }

  _waitForErrorDelay() {
    this._logger.debug('Waiting for error delay... %d', this._context.task.errorDelay);
    return waitForDelay(this._context.task.errorDelay);
  }

  _handleAbort(id) {
    if (id === this._context.id) {
      this._context.aborted = true;
    }
  }

  _handleHarvest(id, token) {
    if (id === this._context.id) {
      this._captchaQueue.insert(token);
    }
  }

  _cleanup() {
    this.stopHarvestCaptcha();
  }

  async getCaptcha() {
    if (!this._captchaQueue) {
      this._captchaQueue = new AsyncQueue();
      this._events.on(TaskManagerEvents.Harvest, this._handleHarvest);
      this._events.emit(TaskManagerEvents.StartHarvest, this._context.id);
    }
    return this._captchaQueue.next();
  }

  stopHarvestCaptcha() {
    if (this._captchaQueue) {
      this._captchaQueue.destroy();
      this._captchaQueue = null;
      this._events.emit(TaskManagerEvents.StopHarvest, this._context.id);
      this._events.removeListener(TaskManagerEvents.Harvest, this._handleHarvest);
    }
  }

  async swapProxies() {
    if (this.proxy) {
      this._events.emit(Events.SwapProxy, this.id, this.proxy, this.shouldBanProxy);
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout'));
        }, 10000); // TODO: Make this a variable delay?
        this._events.once(Events.ReceiveProxy, (id, proxy) => {
          clearTimeout(timeout);
          resolve(proxy);
        });
      });
    }
    // if no proxies, we kinda have to wait awhile here :/
    return new Promise(reject => {
      setTimeout(() => reject(), 60000); // TODO - hardcoded a minute wait
    });
  }

  // MARK: Event Registration
  registerForEvent(event, callback) {
    switch (event) {
      case Events.TaskStatus: {
        this._events.on(Events.TaskStatus, callback);
        break;
      }
      case Events.QueueBypassStatus: {
        this._events.on(Events.QueueBypassStatus, callback);
        break;
      }
      case Events.MonitorStatus: {
        this._events.on(Events.MonitorStatus, callback);
        break;
      }
      case Events.CheckoutStatus: {
        this._events.on(Events.CheckoutStatus, callback);
        break;
      }
      case Events.All: {
        this._events.on(Events.TaskStatus, callback);
        this._events.on(Events.QueueBypassStatus, callback);
        this._events.on(Events.MonitorStatus, callback);
        this._events.on(Events.CheckoutStatus, callback);
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
      case Events.QueueBypassStatus: {
        this._events.removeListener(Events.QueueBypassStatus, callback);
        break;
      }
      case Events.MonitorStatus: {
        this._events.removeListener(Events.MonitorStatus, callback);
        break;
      }
      case Events.CheckoutStatus: {
        this._events.removeListener(Events.CheckoutStatus, callback);
        break;
      }
      case Events.All: {
        this._events.removeListener(Events.TaskStatus, callback);
        this._events.removeListener(Events.QueueBypassStatus, callback);
        this._events.removeListener(Events.MonitorStatus, callback);
        this._events.removeListener(Events.CheckoutStatus, callback);
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
      case Events.TaskStatus:
      case Events.QueueBypassStatus:
      case Events.MonitorStatus:
      case Events.CheckoutStatus: {
        this._events.emit(event, this._context.id, payload, event);
        break;
      }
      default: {
        break;
      }
    }
    // Emit all events on the All channel
    this._events.emit(Events.All, this._context.id, payload, event);
    this._logger.verbose('Event %s emitted: %j', event, payload);
  }

  _emitTaskEvent(payload) {
    this._emitEvent(Events.TaskStatus, payload);
  }

  _emitQueueBypassEvent(payload) {
    this._emitEvent(Events.QueueBypassStatus, payload);
  }

  _emitMonitorEvent(payload) {
    this._emitEvent(Events.MonitorStatus, payload);
  }

  _emitCheckoutEvent(payload) {
    this._emitEvent(Events.CheckoutStatus, payload);
  }

  // Task Setup Promise 1 - generate payment token
  generatePaymentToken() {
    return new Promise(async (resolve, reject) => {
      const token = await this._checkout.handleGeneratePaymentToken();
      if (!token) {
        reject();
      }
      resolve(token);
    });
  }

  // Task Setup Promise 2 - create checkout session
  createCheckout() {
    return new Promise(async (resolve, reject) => {
      const checkout = await this._checkout.handleCreateCheckout();
      if (!checkout.res || checkout.error) {
        reject(checkout.code);
      }
      resolve(checkout.res);
    });
  }

  login() {
    return new Promise(async (resolve, reject) => {
      const loggedIn = await this._checkout.handleLogin();
      if (!loggedIn) {
        reject(loggedIn);
      }
      resolve(loggedIn);
    });
  }

  // MARK: State Machine Step Logic

  async _handleStarted() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    this._logger.silly('Starting task setup');
    this._emitTaskEvent({
      message: 'Starting Task Setup',
    });
    return States.TaskSetup;
  }

  /**
   * RESULTS (INDICES):
   * 0. Promise 1 – generating payment tokens
   * 2. Promise 2 – creating checkout session
   * 3. Promise 3 – logging in (if required)
   */
  async _handleTaskSetup() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { username, password } = this._context.task;
    const promises =
      username && password
        ? [this.generatePaymentToken(), this.createCheckout(), this.login()]
        : [this.generatePaymentToken(), this.createCheckout()];
    this._logger.silly('Running Task Setup Promises');
    const results = await Promise.all(promises.map(reflect));
    this._logger.silly('Async promises results: %j', results);
    const failed = results.filter(res => res.status === 'rejected');
    if (failed.length > 0) {
      this._logger.silly('Task setup failed: %j', failed);
      // check banned status
      const banned = failed.some(f => f.e === 403 || f.e === 429 || f.e === 430);
      if (banned) {
        return States.SwapProxies;
      }

      // check queue
      const queue = failed.some(f => f.e === 303);
      if (queue) {
        this._context.setup = false;
        this._emitTaskEvent({
          message: 'Waiting in queue',
        });
        return States.Queue;
      }

      // if not queue, but something failed, let's do task setup later
      this._context.setup = false;
      this._logger.verbose('Completing task setup later');
      this._emitTaskEvent({
        message: 'Doing task setup later',
      });
    } else {
      this._logger.verbose('Task setup successfully completed');
      this._context.setup = true;
    }
    this._emitTaskEvent({
      message: 'Monitoring for product...',
    });
    return States.Monitor;
  }

  async _handleCheckoutQueue() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.pollCheckoutQueue();

    if (res.error) {
      this._logger.verbose('Error in polling queue %d', res.error);
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          // soft ban
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Swapping proxy',
          });
          return States.SwapProxies;
        default:
          // stop if not a soft ban
          this._emitTaskEvent({
            message: 'Error while handling queue, stopping..',
          });
          return States.Stopped;
      }
    }
    // we're still in queue
    if (!res) {
      this._emitTaskEvent({
        message: 'Waiting in queue',
      });
      this._logger.silly('Waiting in checkout queue');
      return States.Queue;
    }
    // otherwise, we're out of queue and can proceed to monitor.
    return States.Monitor;
  }

  async _handleMonitor() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._monitor.run();
    if (res.errors) {
      this._logger.verbose('Monitor Handler completed with errors: %j', res.errors);
      this._emitTaskEvent({
        message: 'Error monitoring product...',
        errors: res.errors,
      });
      await this._waitForErrorDelay();
    }
    this._emitTaskEvent({
      message: res.message,
    });
    if (res.nextState === States.SwapProxies) {
      this.shouldBanProxy = res.shouldBan; // Set a flag to ban the proxy if necessary
    }
    // Monitor will be in charge of choosing the next state
    return res.nextState;
  }

  async _handleSwapProxies() {
    try {
      this._logger.verbose('Waiting for new proxy...');
      const proxy = await this.swapProxies();
      // Update the references
      this.proxy = proxy;
      this._context.proxy = proxy.proxy;
      this.shouldBanProxy = false; // reset ban flag
    } catch (err) {
      this._logger.verbose('Swap Proxies Handler completed with errors: %s', err, err);
      this._emitTaskEvent({
        message: 'Error Swapping Proxies! Retrying...',
        errors: err,
      });
      await this._waitForErrorDelay();
    }
    // Go back to previous state
    return this._prevState;
  }

  async _handlePatchCart() {
    if (this._context.aborted) {
      this._logger.info('Abort detected, stopping...');
      return States.Aborted;
    }
    const { monitorDelay, errorDelay } = this._context.task;

    const res = await this._checkout.handlePatchCart();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during ATC, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PatchCart;
      }
    }

    if (res.errors) {
      this._logger.verbose('Patch cart error: %j', res.errors);
      if (res.errors === CheckoutErrorCodes.OOS || res.errors === CheckoutErrorCodes.ATC) {
        this._emitTaskEvent({
          message: 'Running for restocks',
        });
        await waitForDelay(monitorDelay);
        return States.PatchCart;
      }
      if (res.errors === CheckoutErrorCodes.MonitorForVariant) {
        this._emitTaskEvent({
          message: 'Waiting for product',
        });
        await waitForDelay(monitorDelay);
        return States.PatchCart;
      }
      if (res.errors === CheckoutErrorCodes.InvalidCheckoutSession) {
        this._emitTaskEvent({
          message: 'Invalid checkout session, rewinding...',
        });
        return States.CreateCheckout;
      }
      await waitForDelay(errorDelay);
      this._emitTaskEvent({
        message: 'Failed: Add to cart, stopping...',
      });
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: 'Fetching shipping rates',
    });
    return States.ShippingRates;
  }

  async _handleShippingRates() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { monitorDelay, errorDelay } = this._context.task;
    const res = await this._checkout.handleGetShippingRates();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during shipping rates, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.ShippingRates;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.ShippingRates) {
        this._emitTaskEvent({
          message: 'Polling for shipping rates',
        });
        await waitForDelay(monitorDelay);
        return States.ShippingRates;
      }
      this._emitTaskEvent({
        message: 'Failed: Fetching shipping rates, stopping...',
      });
      await waitForDelay(errorDelay);
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: `Using shipping rate: ${res.rate}`,
    });
    return States.PaymentGateway;
  }

  async _handlePaymentGateway() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { monitorDelay, errorDelay } = this._context.task;
    const res = await this._checkout.handleGetPaymentGateway();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during payment gateway, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PaymentGateway;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.InvalidGateway) {
        this._emitTaskEvent({
          message: 'Polling for payment gateway',
        });
        await waitForDelay(monitorDelay);
        return States.PaymentGateway;
      }
      this._emitTaskEvent({
        message: 'Failed: Fetching payment gateway, stopping...',
      });
      await waitForDelay(errorDelay);
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: `Payment processing`,
    });
    return States.PostPayment;
  }

  async _handlePostPayment() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { errorDelay } = this._context.task;
    const res = await this._checkout.handlePostPayment();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during post payment, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PostPayment;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.InvalidCaptchaToken) {
        this._emitTaskEvent({
          message: 'Waiting for captcha',
        });
        return States.Captcha;
      }
      if (res.errors === CheckoutErrorCodes.Review) {
        this._emitTaskEvent({
          message: 'Payment processing',
        });
        return States.Review;
      }
    }
    this._emitTaskEvent({
      message: 'Payment Processing',
    });
    return States.Processing;
  }

  async _handleReview() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { errorDelay } = this._context.task;
    const res = await this._checkout.handlePaymentReview();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during post payment, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PostPayment;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.InvalidCaptchaToken) {
        this._emitTaskEvent({
          message: 'Waiting for captcha',
        });
        return States.Captcha;
      }
      if (res.errors === CheckoutErrorCodes.Review) {
        this._emitTaskEvent({
          message: 'Payment processing',
        });
        return States.Review;
      }
    }
    this._emitTaskEvent({
      message: 'Payment processing',
    });
    return States.Processing;
  }

  async _handlePaymentProcessing() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }
    this._context.timer.start(now());

    const { monitorDelay, errorDelay } = this._context.task;
    const res = await this._checkout.handleProcessing();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during post payment, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PostPayment;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.Processing) {
        this._emitTaskEvent({
          message: 'Payment processing',
        });
        await waitForDelay(monitorDelay);
        return States.Processing;
      }
      this._emitTaskEvent({
        message: 'Payment failed',
      });
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: 'Payment successful! Stopping task...',
    });
    return States.Stopped;
  }

  async _handleShutdown() {
    return States.Stopped;
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    this._logger.verbose('Handling state: %s', currentState);

    const stepMap = {
      [States.Started]: this._handleStarted,
      [States.TaskSetup]: this._handleTaskSetup,
      [States.Queue]: this._handleCheckoutQueue,
      [States.Monitor]: this._handleMonitor,
      [States.PatchCart]: this._handlePatchCart,
      [States.ShippingRates]: this._handleShippingRates,
      [States.PaymentGateway]: this._handlePaymentGateway,
      [States.Review]: this._handleReview,
      [States.PostPayment]: this._handlePostPayment,
      [States.Processing]: this._handlePaymentProcessing,
      [States.SwapProxies]: this._handleSwapProxies,
      [States.Checkout]: this._handleCheckout,
      [States.Aborted]: this._handleShutdown,
    };
    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }

  // MARK: State Machine Run Loop

  async start() {
    this._prevState = States.Started;
    this._state = States.Started;
    while (this._state !== States.Stopped) {
      let nextState = this._state;
      if (this._context.aborted) {
        nextState = States.Aborted;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        nextState = await this._handleStepLogic(this._state);
      } catch (e) {
        this._logger.debug('Run loop errored out! %s', e);
        nextState = States.Errored;
      }
      this._logger.verbose('Run Loop finished, state transitioned to: %s', nextState);
      this._prevState = this._state;
      this._state = nextState;
    }

    this._cleanup();
  }
}

TaskRunner.Events = Events;
TaskRunner.States = States;

module.exports = TaskRunner;
