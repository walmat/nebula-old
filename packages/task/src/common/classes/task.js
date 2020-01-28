import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

<<<<<<< HEAD
import { waitForDelay, emitEvent } from '../utils';
import { stopHarvestCaptcha } from './captcha';
import { Task, Platforms } from '../constants';
=======
import CapacityQueue from './capacityQueue';
import { emitEvent } from '../utils';
import { Task } from '../constants';
>>>>>>> shopify-rework

const { States, Events } = Task;

export default class BaseTask {
  get state() {
    return this._state;
  }

  get context() {
    return this._context;
  }

  get platform() {
    return this._platform;
  }

  get delayer() {
    return this._delayer;
  }

  constructor(context, state, platform) {
    this._context = context;
    this._aborter = new AbortController();
    this._signal = this._aborter.signal;
    this._platform = platform;
    this._delayer = null;

    // eslint-disable-next-line global-require
    let _fetch = fetch;
    if (platform !== Platforms.Footsites) {
       _fetch = require('fetch-cookie/node-fetch')(fetch, context.jar);
    }
    this._fetch = defaults(_fetch, context.task.store.url, {
      timeout: 60000, // can be overridden as necessary per request
      signal: this._aborter.signal,
    });

    this._history = new CapacityQueue();

    this._state = state;
    this._prevState = this._state;
  }

  _handleHarvest(id, token) {
    const { captchaQueue } = this.context;
    if (id !== this.context.id || !captchaQueue) {
      return;
    }

    captchaQueue.insert(token);
  }

  async _logCookies(jar = this.context.jar) {
    const store = jar.Store || jar.store;

    if (!store) {
      return;
    }

    store.getAllCookies((_, cookies) => {
      this.context.logger.info(JSON.stringify(cookies, null, 2));
    });
  }

  async swapProxies() {
    const { id, proxy, task, proxyManager } = this.context;
    const proxyId = proxy ? proxy.id : null;
    const newProxy = await proxyManager.swap(id, proxyId, task.store.url);
    return newProxy;
  }

  async _handleSwap() {
    const { logger } = this.context;
    try {
      const proxy = await this.swapProxies();

      logger.debug('Using new proxy: %j', proxy ? proxy.raw : 'localhost');
      this.context.setLastProxy(this.context.proxy);
      this.context.setProxy(proxy);

      emitEvent(
        this.context,
        this.context.ids,
        {
          chosenProxy: proxy ? proxy.raw : null,
        },
        Events.TaskStatus,
      );

      logger.debug('Rewinding to state: %s', this._prevState);
      return this._prevState;
    } catch (error) {
      logger.error('Swap Proxies Handler completed with errors: %s', error.toString());
      emitEvent(
        this.context,
        this.context.ids,
        {
          message: 'Error swapping proxies! Retrying',
        },
        Events.TaskStatus,
      );
    }
    return this._prevState;
  }

  async loop() {
    let nextState = this._state;

    const { aborted, logger } = this.context;
    if (aborted) {
      nextState = States.ABORT;
      return true;
    }

    try {
      nextState = await this._handleStepLogic(this._state);
    } catch (e) {
      if (!/aborterror/i.test(e.name)) {
        logger.verbose('Task errored out! %s', e);
        nextState = States.ERROR;
        return true;
      }
    }

    if (this._state !== nextState) {
      this._prevState = this._state;
      this._state = nextState;

      this._history.insert(nextState);
    }

    if (nextState === States.ABORT) {
      return true;
    }

    return false;
  }

  async run() {
    let shouldStop = false;

    emitEvent(
      this.context,
      [this.context.id],
      {
        chosenProxy: this.context.proxy ? this.context.proxy.raw : null,
      },
      Events.TaskStatus,
    );

    do {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.loop();
    } while (this._state !== States.DONE && !shouldStop);

    console.log(this._history.stack.toString());
  }

  stop() {
    this._state = States.ABORT;
    this._aborter.abort();
    if (this._delayer) {
      this._delayer.clear();
    }
    return this.context.setAborted(true);
  }
}
