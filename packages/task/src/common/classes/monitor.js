import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

import { emitEvent } from '../utils';
import { Monitor, Task } from '../constants';

const { States } = Monitor;
const { Events } = Task;

export default class BaseMonitor {
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

  constructor(context, platform) {
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

    this._prevState = null;
  }

  async swapProxies() {
    const { id, proxy, task, logger, proxyManager } = this.context;
    const proxyId = proxy ? proxy.id : null;
    logger.debug('Swapping proxy with id: %j', proxyId);
    const newProxy = await proxyManager.swap(id, proxyId, task.store.url, this._platform);
    logger.debug('Received new proxy: %j', newProxy ? newProxy.proxy : null);
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
          message: 'Proxy error! Retrying...',
        },
        Events.MonitorStatus,
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
        logger.verbose('Monitor errored out! %s', e);
        nextState = States.ABORT;
      }
    }
    logger.debug('Monitor Loop finished, state transitioned to: %s', nextState);

    if (this._state !== nextState) {
      this._prevState = this._state;
      this._state = nextState;
    }

    if (nextState === States.ABORT) {
      return true;
    }

    return false;
  }

  stop(id) {
    const { logger } = this.context;

    if (!this.context.hasId(id)) {
      return;
    }

    logger.debug('Removing id from ids: %s, %j', id, this.context.ids);
    this.context.removeId(id);

    logger.debug('Amount of ids: %d', this.context.ids.length);

    if (this.context.isEmpty()) {
      this.context.setAborted(true);
      this._aborter.abort();
      if (this._delayer) {
        this._delayer.clear();
      }
    }
  }

  async run() {
    let shouldStop = false;

    do {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.loop();
    } while (this._state !== States.ABORT && !shouldStop);
  }
}
