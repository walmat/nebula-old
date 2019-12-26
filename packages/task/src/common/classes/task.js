import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

import { emitEvent } from '../utils';
import { stopHarvestCaptcha } from './captcha';
import { Task } from '../constants';

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
    const _fetch = require('fetch-cookie/node-fetch')(fetch, context.jar);
    this._fetch = defaults(_fetch, context.task.store.url, {
      timeout: 10000, // can be overridden as necessary per request
      signal: this._aborter.signal,
    });

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

  _handleSecure(id, token) {
    const { secureQueue } = this.context;
    if (id !== this.context.id || !secureQueue) {
      return;
    }

    secureQueue.insert(token);
  }

  async swapProxies() {
    const { id, proxy, task, logger, proxyManager } = this.context;
    const proxyId = proxy ? proxy.id : null;
    logger.debug('Swapping proxy: %j', proxy ? proxy.raw : null);
    const newProxy = await proxyManager.swap(id, proxyId, task.store.url, this._platform);
    logger.debug('Received new proxy: %j', newProxy ? newProxy.raw : null);
    return newProxy;
  }

  async _handleSwap() {
    const { logger } = this.context;
    try {
      logger.silly('Waiting for new proxy...');
      const proxy = await this.swapProxies();

      logger.debug('Proxy in _handleSwap: %j', proxy);
      this.context.setLastProxy(this.context.proxy);
      this.context.setProxy(proxy);

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

    logger.silly('Task state transitioned to: %s', nextState);
    if (this._state !== nextState) {
      this._prevState = this._state;
      this._state = nextState;
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

    this._cleanup();
  }

  stop() {
    this._state = States.ABORT;
    this._aborter.abort();
    if (this._delayer) {
      this._delayer.clear();
    }
    return this.context.setAborted(true);
  }

  _cleanup() {
    stopHarvestCaptcha(this.context, this._handleHarvest, this._platform);
  }
}
