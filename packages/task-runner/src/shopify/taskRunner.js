const EventEmitter = require('events');
const request = require('request-promise');

const Timer = require('./classes/timer');
const Monitor = require('./classes/monitor');
const AsyncQueue = require('./classes/asyncQueue');
const { States, Events, DelayTypes } = require('./classes/utils/constants').TaskRunner;
const TaskManagerEvents = require('./classes/utils/constants').TaskManager.Events;
const { createLogger } = require('../common/logger');
const { waitForDelay } = require('./classes/utils');
const { getCheckoutMethod } = require('./classes/checkouts');

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
    this._state = States.Initialized;

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
    const CheckoutCreator = getCheckoutMethod(this._context.task.site, this._logger);
    this._checkout = CheckoutCreator({
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
    this._handleDelay = this._handleDelay.bind(this);

    this._events.on(TaskManagerEvents.ChangeDelay, this._handleDelay);
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

  _handleDelay(id, delay, type) {
    if (id === this._context.id) {
      if (type === DelayTypes.error) {
        this._context.task.errorDelay = delay;
      } else if (type === DelayTypes.monitor) {
        this._context.task.monitorDelay = delay;
      }
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
      let timeout;
      const proxyHandler = (id, proxy) => {
        clearTimeout(timeout);
        resolve(proxy);
      };
      timeout = setTimeout(() => {
        this._events.removeListener(Events.ReceiveProxy, proxyHandler);
        reject(new Error('Timeout'));
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

  // MARK: State Machine Step Logic

  async _handleStarted() {
    this._logger.silly('Starting task setup');
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    if (this._context.task.username && this._context.task.password) {
      this._emitTaskEvent({
        message: 'Logging in...',
      });
      return States.Login;
    }
    this._emitTaskEvent({
      message: 'Starting Task Setup',
    });
    return States.PaymentToken;
  }

  async _handleLogin() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.login();

    this._emitTaskEvent({
      message: res.message,
    });
    return res.nextState;
  }

  async _handlePaymentToken() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.getPaymentToken();

    this._emitTaskEvent({
      message: res.message,
    });
    return res.nextState;
  }

  async _handleCreateCheckout() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.createCheckout();

    this._emitTaskEvent({
      message: res.message,
    });
    return res.nextState;
  }

  async _handlePatchCheckout() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.patchCheckout();

    this._emitTaskEvent({
      message: res.message,
    });
    return res.nextState;
  }

  async _handlePollQueue() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.pollQueue();

    if (res.nextState) {
      this._emitTaskEvent({
        message: res.message,
      });
      return res.nextState;
    }

    // TODO: make sure `prevState` doesn't get overwrote when visiting same state more than once
    return this._prevState;
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

  async _handleAddToCart() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.addToCart();

    this._emitTaskEvent({
      message: res.message,
    });
    return res.nextState;
  }

  async _handleShipping() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.shippingRates();

    this._emitTaskEvent({
      message: res.message,
    });
    return res.nextState;
  }

  async _handleRequestCaptcha() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const token = await this.getCaptcha();

    if (!token) {
      this._logger.verbose('Failed: Harvesting captcha token');
      return States.Stopped;
    }
    this._checkout.captchaToken = token;
    return this._prevState;
  }

  async _handlePostPayment() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.postPayment();

    this._emitTaskEvent({
      message: res.message,
    });
    return res.nextState;
  }

  async _handleCompletePayment() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.completePayment();

    this._emitTaskEvent({
      message: res.message,
    });
    return res.nextState;
  }

  async _handlePaymentProcess() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.paymentProcessing();

    this._emitTaskEvent({
      message: res.message,
    });
    return res.nextState;
  }

  async _handleSwapProxies() {
    try {
      this._logger.verbose('Waiting for new proxy...');
      const proxy = await this.swapProxies();
      // Proxy is fine, update the references
      if (proxy) {
        this.proxy = proxy;
        this._context.proxy = proxy.proxy;
        this.shouldBanProxy = false; // reset ban flag
        return this._prevState;
      }

      // If we get a null proxy back, there aren't any available. We should wait the error delay, then try again
      await this._waitForErrorDelay();
      // If we have a hard ban, continue waiting for open proxy
      if (this.shouldBanProxy) {
        this._emitTaskEvent({
          message: 'No open proxies available! Waiting...',
        });
        return States.SwapProxies;
      }
    } catch (err) {
      this._logger.verbose('Swap Proxies Handler completed with errors: %s', err, err);
      this._emitTaskEvent({
        message: 'Error swapping proxies! Retrying...',
        errors: err,
      });
      await this._waitForErrorDelay();
      return States.SwapProxies;
    }
    // Go back to previous state
    return this._prevState;
  }

  _generateEndStateHandler(state) {
    let status = 'stopped';
    switch (state) {
      case States.Aborted: {
        status = 'aborted';
        break;
      }
      case States.Errored: {
        status = 'errored out';
        break;
      }
      case States.Finished: {
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
      });
      return States.Stopped;
    };
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    this._logger.verbose('Handling state: %s', currentState);

    const stepMap = {
      [States.Started]: this._handleStarted,
      [States.Login]: this._handleLogin,
      [States.PaymentToken]: this._handlePaymentToken,
      [States.CreateCheckout]: this._handleCreateCheckout,
      [States.PollQueue]: this._handlePollQueue,
      [States.PatchCheckout]: this._handlePatchCheckout,
      [States.Monitor]: this._handleMonitor,
      [States.AddToCart]: this._handleAddToCart,
      [States.ShippingRates]: this._handleShipping,
      [States.RequestCaptcha]: this._handleRequestCaptcha,
      [States.PostPayment]: this._handlePostPayment,
      [States.CompletePayment]: this._handleCompletePayment,
      [States.PaymentProcess]: this._handlePaymentProcess,
      [States.SwapProxies]: this._handleSwapProxies,
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

      if (this._state !== nextState) {
        this._prevState = this._state;
        this._state = nextState;
      }
    }

    this._cleanup();
  }
}

TaskRunner.Events = Events;
TaskRunner.States = States;

module.exports = TaskRunner;
