const EventEmitter = require('events');
const request = require('request-promise');

const Timer = require('./classes/timer');
const Monitor = require('./classes/monitor');
const AsyncQueue = require('./classes/asyncQueue');
const { States, Events } = require('./classes/utils/constants').TaskRunner;
const TaskManagerEvents = require('./classes/utils/constants').TaskManager.Events;
const { CheckoutErrorCodes } = require('./classes/utils/constants').ErrorCodes;
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

  // MARK: State Machine Step Logic

  async _handleStarted() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }
    this._logger.silly('Starting task setup');

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

    const { monitorDelay } = this._context.task;

    const res = await this._checkout.login();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430: {
          // soft ban
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Swapping proxy',
          });
          return States.SwapProxies;
        }
        default: {
          this._emitTaskEvent({
            message: 'Failed: Logging in',
          });
          return States.Stopped;
        }
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.InvalidCaptchaToken) {
        this._emitTaskEvent({
          message: 'Waiting for captcha',
        });
        return States.RequestCaptcha;
      }
      if (res.errors === CheckoutErrorCodes.Password) {
        this._emitTaskEvent({
          message: 'Password page',
        });
        await waitForDelay(monitorDelay);
        return States.Login;
      }
      this._emitTaskEvent({
        message: 'Failed: Logging in',
      });
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: 'Fetching payment token',
    });
    return States.PaymentToken;
  }

  async _handlePaymentToken() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.paymentToken();

    if (!res) {
      this._logger.verbose('Failed: fetching payment token');
      return States.Stopped;
    }
    // TODO:
    // API - Go To Create Checkout
    // Frontend - Go To Monitor
    // this._emitTaskEvent({
    //   message: 'Creating Checkout',
    // });
    // return States.CreateCheckout;
  }

  async _handleCreateCheckout() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.createCheckout();

    if (res.status) {
      switch (res.status) {
        case 303: {
          this._emitTaskEvent({
            message: 'Waiting in queue',
          });
          return States.PollQueue;
        }
        case 403:
        case 429:
        case 430: {
          // soft ban
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Swapping proxy',
          });
          return States.SwapProxies;
        }
        default: {
          this._emitTaskEvent({
            message: 'Failed: Creating checkout',
          });
          return States.Stopped;
        }
      }
    }

    if (res.errors) {
      this._emitTaskEvent({
        message: 'Failed: Creating checkout',
      });
      return States.Stopped;
    }

    // TODO:
    //   If this._context.task.product.variants is set (MONITOR has completed)
    //     API - Go To Add to Cart
    //     Frontend - Go To Shipping Rates
    //
    //   Else
    //     API - Go To Monitor
    //     Frontend - Impossible Case (Monitor is required to have completed before getting here)
    //              - Can Go Back to Monitor
    // this._emitTaskEvent({
    //   message: 'Monitoring for product...',
    // });
    // return States.Monitor;
  }

  async _handlePollQueue() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.pollQueue();

    if (res.status) {
      this._logger.verbose('Polling queue responded with statusCode: %d', res.status);
      switch (res.status) {
        case 303: {
          this._emitTaskEvent({
            message: 'Waiting in queue',
          });
          await waitForDelay(1000);
          return States.PollQueue;
        }
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
    if (res.errors) {
      this._emitTaskEvent({
        message: 'Failed: Polling queue',
      });
      return States.Stopped;
    }
    // TODO: Send Poll Queue to Previous State, not just monitor
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

  async _handleAddToCart() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { monitorDelay } = this._context.task;

    // TODO:
    //   API - Check for Valid Checkout before running Add To Cart Step
    //       - Go To Create Checkout if it has not been created yet
    const res = await this._checkout.addToCart();

    // TODO:
    //   Frontend - If Add To Cart is successful, Go To Create Checkout
    //            - If Add To Cart Fails (OOS) - Delay and Go to Add To Cart
    //            - Handle other cart errors

    // TODO:
    //    API - Go To Shipping Rates if Add To Cart is successful
    //        - If Add To Cart Files (OOS) - Delay and Go To Add To Cart
    //        - Handle other cart errors

    if (res.status) {
      switch (res.status) {
        case 303: {
          this._emitTaskEvent({
            message: 'Waiting in queue',
          });
          return States.PollQueue;
        }
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
            message: 'Error while adding to cart, stopping..',
          });
          return States.Stopped;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.OOS) {
        this._emitTaskEvent({
          message: 'Running for restocks',
        });
        await waitForDelay(monitorDelay);
        return States.AddToCart;
      }
      if (res.errors === CheckoutErrorCodes.MonitorForVariant) {
        this._emitTaskEvent({
          message: 'Waiting for variant',
        });
        await waitForDelay(monitorDelay);
        return States.AddToCart;
      }
      if (res.errors === CheckoutErrorCodes.InvalidCheckoutSession) {
        this._emitTaskEvent({
          message: 'Creating checkout session',
        });
        return States.CreateCheckout;
      }
      this._emitTaskEvent({
        message: 'Failed: Adding to cart',
      });
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: 'Fetching shipping rates',
    });
    return States.ShippingRates;
  }

  // TODO: Change to just _handleShipping
  // API - Only worry about shipping rates
  // Frontend - handle shipping rates AND post customer info
  async _handleShippingRates() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { monitorDelay } = this._context.task;

    const res = await this._checkout.shippingRates();

    // TODO:
    //   API - Go to Payment Gateway
    //   Frontend - Go to Payment Gateway
    //   Handle errors

    if (res.status) {
      switch (res.status) {
        case 303: {
          this._emitTaskEvent({
            message: 'Waiting in queue',
          });
          return States.PollQueue;
        }
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
            message: 'Error while fetching shipping rates, stopping..',
          });
          return States.Stopped;
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
        message: 'Failed: Fetching shipping rates',
      });
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: `Using shipping: ${res.rate}`,
    });
    return States.PaymentGateway;
  }

  async _handleRequestCaptcha() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }
  }

  // async _handleSubmitContact() {
  //   // exit if abort is detected
  //   if (this._context.aborted) {
  //     this._logger.info('Abort Detected, Stopping...');
  //     return States.Aborted;
  //   }
  // }

  async _handlePaymentGateway() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { monitorDelay, errorDelay } = this._context.task;
    const res = await this._checkout.paymentGateway();

    // TODO:
    //   Both - Go to Post Payment
    //   handle errors

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
      if (res.errors === CheckoutErrorCodes.Account) {
        this._emitTaskEvent({
          message: 'Logging in',
        });
        return States.Login;
      }
      if (res.errors === CheckoutErrorCodes.InvalidCaptchaToken) {
        this._emitTaskEvent({
          message: 'Waiting for captcha',
        });
        return States.Captcha;
      }
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
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { errorDelay } = this._context.task;
    const res = await this._checkout.postPayment();

    // TODO:
    //   Both - Go to Payment Review
    //   handle errors

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
          this._emitTaskEvent({
            message: 'Posting payment',
          });
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

  async _handlePaymentReview() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { errorDelay } = this._context.task;
    const res = await this._checkout.paymentReview();

    // TODO:
    //   Both - Go to Process Payment
    //   handle errors

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
        return States.RequestCaptcha;
      }
      if (res.errors === CheckoutErrorCodes.Review) {
        this._emitTaskEvent({
          message: 'Payment processing',
        });
        return States.PaymentReview;
      }
    }
    this._emitTaskEvent({
      message: 'Payment processing',
    });
    return States.PaymentProcess;
  }

  async _handlePaymentProcess() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { monitorDelay, errorDelay } = this._context.task;
    const res = await this._checkout.paymentProcessing();

    // TODO:
    //   Both - Finish - Go To Stopped
    //   handle errors

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

  async _handleCaptcha() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { errorDelay } = this._context.task;
    const { errors } = await this._checkout.handleRequestCaptcha();
    if (errors) {
      this._emitTaskEvent({
        message: 'Failed: Unable to get captcha token, stopping...',
      });
      await waitForDelay(errorDelay);
      return States.Stopped;
    }
    return this._prevState;
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
        message: this._context.status || `Task has ${status}`,
      });
      return States.Stopped;
    }
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
      [States.Monitor]: this._handleMonitor,
      [States.AddToCart]: this._handleAddToCart,
      [States.ShippingRates]: this._handleShippingRates,
      [States.RequestCaptcha]: this._handleRequestCaptcha,
      [States.SubmitContact]: this._handleSubmitContact,
      [States.PaymentGateway]: this._handlePaymentGateway,
      [States.PostPayment]: this._handlePostPayment,
      [States.PaymentReview]: this._handlePaymentReview,
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
      // TODO: Prevent prevState from starting an infinite loop (prevState === state)
      this._prevState = this._state;
      this._state = nextState;
    }

    this._cleanup();
  }
}

TaskRunner.Events = Events;
TaskRunner.States = States;

module.exports = TaskRunner;
