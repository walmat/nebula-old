import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

const TaskManagerEvents = require('../../constants').Manager.Events;
const Discord = require('../../common/discord');
// const Slack = require('../../common/slack');
const AsyncQueue = require('../../common/asyncQueue');
const { waitForDelay } = require('../../common');
const { Events } = require('../../constants').Runner;
const {
  TaskRunner: { States, Types, DelayTypes, HookTypes, HarvestStates },
} = require('../utils/constants');

class TaskRunner {
  constructor(context, proxy) {
    this.id = context.id;
    this._task = context.task;
    this.taskId = context.taskId;
    this._events = context.events;
    this._aborted = context.aborted;
    this._aborter = new AbortController();
    this._signal = this._aborter.signal;
    this.proxy = proxy;

    // eslint-disable-next-line global-require
    const _request = require('fetch-cookie')(fetch, context.jar);
    this._request = defaults(_request, this._task.site.url, {
      timeout: 120000, // to be overridden as necessary
      signal: this._aborter.signal, // generic abort signal
    });

    this._delayer = null;
    this._captchaQueue = null;
    this._state = States.WAIT_FOR_PRODUCT;

    this._discord = new Discord(this._task.discord);
    // this._slack = new Slack(this._task.slack);
    this._logger = context.logger;

    this._context = {
      ...context,
      proxy: proxy ? proxy.proxy : null,
      rawProxy: proxy ? proxy.raw : null,
      aborter: this._aborter,
      delayer: this._delayer,
      signal: this._aborter.signal,
      request: this._request,
      jar: context.jar,
      discord: this._discord,
      // slack: this._slack,
      logger: this._logger,
      aborted: this._aborted,
      harvestState: HarvestStates.idle,
    };

    this._history = [];

    this._handleAbort = this._handleAbort.bind(this);
    this._handleDelay = this._handleDelay.bind(this);
    // this._handleProduct = this._handleProduct.bind(this);

    this._events.on(TaskManagerEvents.ChangeDelay, this._handleDelay, this);
    this._events.on(TaskManagerEvents.UpdateHook, this._handleUpdateHooks, this);
    // this._events.on(TaskManagerEvents.ProductFound, this._handleProduct, this);
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
        this._checkout._context.proxy = proxy.proxy;
        this.shouldBanProxy = 0; // reset ban flag
        this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
        this._emitTaskEvent({
          message: `Swapped proxy to: ${proxy.raw}`,
          proxy: proxy.raw,
        });
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

  async _handleWaitForProduct() {
    const { aborted } = this._context;

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
    const { aborted } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    // TODO: Add to cart request and check for failure
    return States.SUBMIT_CHECKOUT;
  }

  async _handleSubmitCheckout() {
    const { aborted } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    // TODO: Submit checkout request and handle failures

    // if queued...
    return States.CHECK_STATUS;
  }

  async _handleCheckStatus() {
    const { aborted } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    // TODO: Call check status request and handle failures

    // if successfully checked out..
    return States.DONE;
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
      [States.WAIT_FOR_PRODUCT]: this._handleWaitForProduct,
      [States.ADD_TO_CART]: this._handleAddToCart,
      [States.SUBMIT_CHECKOUT]: this._handleSubmitCheckout,
      [States.CHECK_STATUS]: this._handleCheckStatus,
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
