const EventEmitter = require('events');
const rp = require('request-promise');

const { Stack } = require('./classes/stack');
const Timer = require('./classes/timer');
const Monitor = require('./classes/monitor');
const Checkout = require('./classes/checkout');
const Account = require('./classes/account');
const { States, Events } = require('./classes/utils/constants').TaskRunner;
const { createLogger } = require('../common/logger');
const { waitForDelay, now, reflect } = require('./classes/utils');

class TaskRunner {
    constructor(id, task, proxy, manager) {
        /**
         * The manager of this task runner
         */
        this._taskManager = manager;

        /**
         * Logger Instance
         */
        this._logger = createLogger({ dir: this._taskManager.loggerPath, name: `TaskRunner-${id}`, filename: `runner-${id}.log` });;

        /**
         * Internal Task Runner State
         */
        this._state = States.Initialized;

        /**
         * Should we do task setup?
         * (always attempt to do task setup at beginning of task)
         */
        this._isSetup = true;

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

        this._jar = rp.jar();
        this._request = rp.defaults({ jar: this._jar });

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
            proxy,
            request: this._request,
            jar: this._jar,
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
            setup: this._isSetup,
            paymentTokens: this._paymentTokens,
            shippingMethods: this._shippingMethods,
            checkoutTokens: this._checkoutTokens,
            getCaptcha: this.getCaptcha.bind(this),
            stopHarvestCaptcha: this.stopHarvestCaptcha.bind(this),
        });

        this._account = new Account(this._context, this._timer, this._request);

        /**
         * Create a new event emitter to handle all IPC communication
         *
         * Events will provide the task id, a message, and a message group
         */
        this._events = new EventEmitter();

        this._handleAbort = this._handleAbort.bind(this);

        this._taskManager._events.on('abort', this._handleAbort);
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

    _cleanup() {
        this._taskManager._events.removeListener('abort', this._handleAbort);
    }

    // MARK: Event Registration

    async getCaptcha() {
        return this._taskManager.startHarvestCaptcha(this._context.id);
    }

    stopHarvestCaptcha() {
        this._taskManager.stopHarvestCaptcha(this._context.id);
    }

    registerForEvent(event, callback) {
        switch(event) {
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
            }
        }
    }

    deregisterForEvent(event, callback) {
        switch(event) {
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
            }
            default: {
                break;
            }
        }
    }

    // MARK: Event Emitting
    _emitEvent(event, payload) {
        switch(event) {
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
            if (token) {
                resolve(token);
            }
            reject(new Error('Unable to generate payment token'));
        });
    }

    // Task Setup Promise 2 - find random product
    findRandomInStockVariant() {
        return new Promise(async (resolve, reject) => {
        // TODO - find random product to choose the prefilled shipping/payment info
          resolve();
        // reject(new Error('Not implemented yet'));
        });
    }

    // Task Setup Promise 3 - create checkout session
    createCheckout() {
        return new Promise(async (resolve, reject) => {
            const checkout = await this._checkout._handleCreateCheckout();
            if (!checkout) {
                reject(new Error('Unable to create checkout'));
            }
            resolve(checkout);
        });
    }

    // MARK: State Machine Step Logic

    async _handleStarted() {
        this._emitTaskEvent({
            message: 'Starting task setup',
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
      this._timer.start(now());
      const promises = [this.generatePaymentToken(), this.findRandomInStockVariant(), this.createCheckout()];
      const results = await Promise.all(promises.map(reflect));
      const failed = results.filter(res => res.status === 'rejected');
      if (failed.length > 0) {
        // let's do task setup later
        this._isSetup = false;
        this._logger.verbose('Task setup failed: %j', failed);
        this._emitTaskEvent({
          message: 'Doing task setup later',
        });
      } else {
        this._isSetup = true;
        this._timer.stop(now());
        this._emitTaskEvent({
          message: 'Monitoring for product...',
        });
      }
      return States.Monitor;
    }
    async _handleMonitor() {
      const res = await this._monitor.run();
      if(res.errors) {
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
      // Monitor will be in charge of choosing the next state
      return res.nextState;
    }

    async _handleSwapProxies() {
      const res = await this._taskManager.swapProxies(this._context.id, this._context.proxy);
      if (res.errors) {
          this._logger.verbose('Swap Proxies Handler completed with errors: %j', res.errors);
          this._emitTaskEvent({
              message: 'Error Swapping Proxies! Retrying Monitor...',
              errors: res.errors,
          });
          await this._waitForErrorDelay();
      }
      // Swap Proxies will be in charge of choosing the next state
      return res.nextState;
    }

    async _handleCheckout() {
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

    _generateEndStateHandler() {
      return () => {
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
          [States.TaskSetup]: this._handleTaskSetup,
          [States.Monitor]: this._handleMonitor,
          [States.SwapProxies]: this._handleSwapProxies,
          [States.Checkout]: this._handleCheckout,
          [States.Finished]: this._generateEndStateHandler(),
          [States.Errored]: this._generateEndStateHandler(),
          [States.Aborted]: this._generateEndStateHandler(),
      }
      const handler = stepMap[currentState] || defaultHandler;
      return await handler.call(this);
    }

    // MARK: State Machine Run Loop

    async start() {
      this._state = States.Started;
      while(this._state !== States.Stopped) {
          if (this._context.aborted) {
              this._state = States.Aborted;
          }
          try {
              this._state = await this._handleStepLogic(this._state);
          } catch (e) {
              this._logger.debug('Run loop errored out! %s', e);
              this._state = States.Errored;
          }
          this._logger.verbose('Run Loop finished, state transitioned to: %s', this._state);
      }

      this._cleanup();
      return;
    }
}

TaskRunner.Events = Events;
TaskRunner.States = States;

module.exports = TaskRunner;
