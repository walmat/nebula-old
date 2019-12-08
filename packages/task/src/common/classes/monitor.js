import AbortController from 'abort-controller';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

import { waitForDelay, emitEvent } from '../utils';
import { Monitor, Task, Platforms } from '../constants';

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
    let _fetch = fetch;
    if (platform !== Platforms.Footsites) {
       _fetch = require('fetch-cookie/node-fetch')(fetch, context.jar);
    }
    this._fetch = defaults(_fetch, context.task.store.url, {
       timeout: 10000, // can be overridden as necessary per request
       signal: this._aborter.signal,
    });
  }

  async swapProxies() {
    const { id, proxy, task, logger, proxyManager } = this._context;
    const proxyId = proxy ? proxy.id : null;
    logger.debug('Swapping proxy with id: %j', proxyId);
    const newProxy = await proxyManager.swap(id, proxyId, task.store.url, this._platform);
    logger.debug('Received new proxy: %j', newProxy ? newProxy.proxy : null);
    return newProxy;
  }

  async _handleSwap() {
    const {
      task: { errorDelay },
      logger,
    } = this._context;
    try {
      logger.silly('Waiting for new proxy...');
      const proxy = await this.swapProxies();

      logger.debug('Proxy in _handleSwap: %j', proxy);
      // Proxy is fine, update the references
      if ((proxy || proxy === null) && this._context.proxy !== proxy) {
        this._context.setLastProxy(this._context.proxy);
        this._context.setProxy(proxy);

        logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
        emitEvent(
          this._context,
          this._context.ids,
          {
            message: `Swapped proxy to: ${proxy ? proxy.raw : 'localhost'}`,
          },
          Events.MonitorStatus,
        );

        logger.debug('Rewinding to state: %s', this._prevState);
        return this._prevState;
      }

      // If we get a null proxy back while our previous proxy was also null.. then there aren't any available
      // We should wait the error delay, then try again
      emitEvent(
        this._context,
        this._context.ids,
        {
          message: `No open proxy! Delaying ${errorDelay}ms`,
        },
        Events.MonitorStatus,
      );

      this._delayer = waitForDelay(errorDelay, this._aborter.signal);
      await this._delayer;
    } catch (error) {
      logger.error('Swap Proxies Handler completed with errors: %s', error.toString());
      emitEvent(
        this._context,
        this._context.ids,
        {
          message: 'Error swapping proxies! Retrying',
        },
        Events.MonitorStatus,
      );
    }
    // Go back to previous state
    return this._prevState;
  }

  async loop() {
    let nextState = this._state;

    const { aborted, logger } = this._context;
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
    const { logger } = this._context;

    if (!this._context.hasId(id)) {
      return;
    }

    logger.debug('Removing id from ids: %s, %j', id, this._context.ids);
    this._context.removeId(id);

    logger.debug('Amount of ids: %d', this._context.ids.length);

    if (!this._context.isEmpty()) {
      this._context.setAborted(true);
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
