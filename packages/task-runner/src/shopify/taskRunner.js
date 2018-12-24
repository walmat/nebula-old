const EventEmitter = require('events');
const request = require('request-promise');

const { Stack } = require('./classes/stack');
const Timer = require('./classes/timer');
const Monitor = require('./classes/monitor');
const Checkout = require('./classes/checkout');
const AsyncQueue = require('./classes/asyncQueue');
const { States, Events } = require('./classes/utils/constants').TaskRunner;
const TaskManagerEvents = require('./classes/utils/constants').TaskManager.Events;
const { createLogger } = require('../common/logger');
const { waitForDelay, reflect } = require('./classes/utils');

class TaskRunner {
  constructor(id, task, proxy, loggerPath) {
    // Add Ids to object
    this.taskId = task.id;
    this.id = id;
    this.proxy = proxy;

    proxy = '127.0.0.1:8888';

    this._jar = request.jar();
    this._request = request.defaults({ jar: this._jar });

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
    this._state = States.Initialized;

    this._captchaQueue = null;
    this._isSetup = false;

    /**
     * Stack of successfully created payment tokens for the runner
     */
    this._paymentTokens = new Stack();

    /**
     * Stack of shipping methods
     */
    this._shippingMethods = new Stack();

    /**
     * Stack of successfully created checkout sessions for the runner
     */
    this._checkoutTokens = new Stack();

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
      jar: this._jar,
      isSetup: this._isSetup,
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
      paymentTokens: this._paymentTokens,
      shippingMethods: this._shippingMethods,
      checkoutTokens: this._checkoutTokens,
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
  }

  _waitForErrorDelay() {
    this._logger.debug('Waiting for error delay...');
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
      const token = await this._checkout._handleGeneratePaymentToken();
      if (!token) {
        reject();
      }
      resolve(token);
    });
  }

  // TODO - Task Setup Promise 2 - find random product
  // findRandomInStockVariant() {
  //   return new Promise(async (resolve, reject) => {
  //     // TODO - find random product to choose the prefilled shipping/payment info
  //     resolve();
  //     // reject(new Error('Not implemented yet'));
  //   });
  // }

  visitSite() {
    return new Promise(async (resolve, reject) => {
      const visit = await this._checkout._handleVisitSite();
      if (!visit) {
        reject();
      }
      // we don't really care what visit is,
      // just need to know that the site is
      // accessible to us.
      resolve();
    });
  }


  // Task Setup Promise 3 - create checkout session
  createCheckout() {
    return new Promise(async (resolve, reject) => {
      const checkout = await this._checkout._handleCreateCheckout();
      if (!checkout.res || checkout.error) {
        reject(checkout.code);
      }
      resolve(checkout.res);
    });
  }

  // MARK: State Machine Step Logic

  async _handleStarted() {
    this._emitTaskEvent({
      message: 'Starting Task Setup',
    });
    return States.TaskSetup;
  }

  /**
   * RESULTS (INDICES):
   * 0. Promise 1 – generating payment tokens
   * 1. Promise 2 – finding random product variant (in stock)
   * 2. Promise 3 – creating checkout token
   */
  async _handleTaskSetup() {
    // TODO - change this back once we have this.findRandomInStockVariant() implemented
    // const promises = (!this._isSetup && !this._doSetupLater)
    // ? [this.generatePaymentToken(), this.findRandomInStockVariant(), this.createCheckout()]
    // : [this.generatePaymentToken(), this.createCheckout()];
    const promises = [this.generatePaymentToken(), this.visitSite(), this.createCheckout()];
    const results = await Promise.all(promises.map(reflect));
    if (results.filter(res => res.status === 'rejected').length > 0) {
      // let's do task setup later
      this._context.isSetup = false;
      this._logger.verbose(
        'Task setup failed: %j',
        results.filter(res => res.status === 'rejected'),
      );
      this._emitTaskEvent({
        message: 'Doing task setup later',
      });
    } else {
      // TODO - not necessary, but will speed things up even more
      // const randomProductVariant = results[1];
      // skip to checkout -> return to monitor
      this._logger.verbose('Task setup success');
      this._context.isSetup = true;
    }
    this._emitTaskEvent({
      message: 'Monitoring for product...',
    });
    // console.log((!this._doSetupLater && this._isSetup) ? States.Checkout : States.Monitor);
    return !this._isSetup ? States.Monitor : States.Monitor;
  }

  async _handleMonitor() {
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

  async _handleCheckout() {
    // start recording our time taken to checkout
    const res = await this._checkout.run();
    if (res.errors) {
      this._logger.verbose('Checkout Handler completed with errors: %j', res.errors);
      this._emitTaskEvent({
        message: 'Errors during Checkout!',
        errors: res.errors,
      });
      await this._waitForErrorDelay();
    }
    this._emitTaskEvent({
      message: res.message,
    });
    // Checkout will be in charge of choosing the next state
    return res.nextState;
  }

  // eslint-disable-next-line class-methods-use-this
  async _generateEndStateHandler(state) {
    return () => States.Stopped;
    // stop our time taken to checkout
    // let status = 'stopped';
    // switch (state) {
    //   case States.Aborted: {
    //     status = 'aborted';
    //     break;
    //   }
    //   case States.Errored: {
    //     status = 'errored out';
    //     break;
    //   }
    //   case States.Finished: {
    //     status = 'finished';
    //     break;
    //   }
    //   default: {
    //     break;
    //   }
    // }
    // return () => {
    //   // this._emitTaskEvent({
    //   //   message: this._context.status || `Task has ${status}`,
    //   // });
    //   // eslint-disable-next-line no-unused-expressions
    //   States.Stopped;
    // };
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    this._logger.verbose('Handling state: %s', currentState);

    const stepMap = {
      [States.Started]: this._handleStarted,
      [States.TaskSetup]: this._handleTaskSetup,
      [States.Monitor]: this._handleMonitor,
      [States.SwapProxies]: this._handleSwapProxies,
      [States.Checkout]: this._handleCheckout,
      [States.Finished]: this._generateEndStateHandler(States.Finished),
      [States.Errored]: this._generateEndStateHandler(States.Errored),
      [States.Aborted]: this._generateEndStateHandler(States.Aborted),
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
