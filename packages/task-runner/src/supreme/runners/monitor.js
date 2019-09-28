import AbortController from 'abort-controller';
import HttpsProxyAgent from 'https-proxy-agent';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';
import { pick, isEqual } from 'lodash';

const TaskManagerEvents = require('../../constants').Manager.Events;
const { Events } = require('../../constants').Runner;
const {
  Monitor: { States, DelayTypes, ParseType },
  TaskRunner: { Types },
} = require('../utils/constants');
const { rfrl, capitalizeFirstLetter, waitForDelay } = require('../../common');

class Monitor {
  constructor(context, proxy, type = ParseType.Keywords) {
    this.id = context.id;
    this._task = context.task;
    this.taskId = context.taskId;
    this.proxy = proxy;
    this._jar = context.jar;
    this._events = context.events;
    this._logger = context.logger;
    this._aborted = context.aborted;
    this._parseType = type;

    this._aborter = new AbortController();
    this._signal = this._aborter.signal;

    // eslint-disable-next-line global-require
    const _request = require('fetch-cookie')(fetch, context.jar);
    this._request = defaults(_request, this._task.site.url, {
      timeout: 120000, // to be overridden as necessary
      signal: this._aborter.signal, // generic abort signal
    });
    this._delayer = null;

    this._state = States.PARSE;
    this._prevState = States.PARSE;
    this.shouldBanProxy = 0;

    this._context = {
      ...context,
      proxy: proxy ? proxy.proxy : null,
      rawProxy: proxy ? proxy.raw : null,
      aborter: this._aborter,
      delayer: this._delayer,
      signal: this._aborter.signal,
      request: this._request,
      jar: this._jar,
      logger: this._logger,
      aborted: this._aborted,
    };

    this._history = [];

    this._handleAbort = this._handleAbort.bind(this);
    this._handleDelay = this._handleDelay.bind(this);

    this._events.on(TaskManagerEvents.ProductFound, this._handleProduct, this);
    this._events.on(TaskManagerEvents.ChangeDelay, this._handleDelay, this);
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

  async _compareProductInput(product, parseType) {
    // we only care about keywords/url matching here...
    switch (parseType) {
      case ParseType.Keywords: {
        const { pos_keywords: posKeywords, neg_keywords: negKeywords } = this._context.task.product;
        const samePositiveKeywords = isEqual(product.pos_keywords.sort(), posKeywords.sort());
        const sameNegativeKeywords = isEqual(product.neg_keywords.sort(), negKeywords.sort());
        return samePositiveKeywords && sameNegativeKeywords;
      }
      case ParseType.Url: {
        const { url } = this._context.task.product;
        return product.url.toUpperCase() === url.toUpperCase();
      }
      default:
        return false;
    }
  }

  async _handleProduct(id, product, parseType) {
    if (parseType === this._parseType) {
      const isSameProductData = await this._compareProductInput(product, parseType);

      if (
        (isSameProductData && !this._context.productFound) ||
        (id === this.id && !this._context.productFound)
      ) {
        this._context.task.product = {
          ...this._context.task.product,
          ...product,
        };

        this._context.productFound = true;
      }
    }
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

  _cleanup() {
    console.log(this._history);
  }

  async swapProxies() {
    // emit the swap event
    this._events.emit(Events.SwapMonitorProxy, this.id, this.proxy, this.shouldBanProxy);
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
      case Events.MonitorStatus: {
        this._events.on(Events.MonitorStatus, callback);
        break;
      }
      default:
        break;
    }
  }

  deregisterForEvent(event, callback) {
    switch (event) {
      case Events.MonitorStatus: {
        this._events.removeListener(Events.MonitorStatus, callback);
        break;
      }
      default: {
        break;
      }
    }
  }

  _emitEvent(event, payload) {
    switch (event) {
      // Emit supported events on their specific channel
      case Events.MonitorStatus: {
        this._events.emit(event, this._context.id, payload, event);
        break;
      }
      default: {
        break;
      }
    }
    this._logger.silly('Event %s emitted: %j', event, payload);
  }

  _emitMonitorEvent(payload = {}) {
    this._logger.debug('PAYLOAD: %j', payload);
    if (payload.message && payload.message !== this._context.status) {
      this._status = payload.message;
      this._emitEvent(Events.MonitorStatus, { ...payload, type: Types.Normal });
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
        this.shouldBanProxy = 0; // reset ban flag
        this._logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
        this._emitMonitorEvent({
          message: `Swapped proxy to: ${proxy.raw}`,
          proxy: proxy.raw,
        });
        return this._prevState;
      }

      this._emitMonitorEvent({
        message: `No open proxy! Delaying ${errorDelay}ms`,
      });
      // If we get a null proxy back, there aren't any available. We should wait the error delay, then try again
      this._delayer = waitForDelay(errorDelay, this._aborter.signal);
      await this._delayer;
      this._emitMonitorEvent({ message: 'Proxy banned!' });
    } catch (err) {
      this._logger.verbose('Swap Proxies Handler completed with errors: %s', err, err);
      this._emitMonitorEvent({
        message: 'Error swapping proxies! Retrying...',
      });
    }
    // Go back to previous state
    return this._prevState;
  }

  async _handleParse() {
    const { aborted, productFound, proxy } = this._context;

    if (aborted || productFound) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { task, proxy, logger } = this._context;
    const { product } = task;

    let res;
    try {
      res = await this._request('/mobile_stock.json', {
        method: 'GET',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        headers: {
          authority: 'www.supremenewyork.com',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': 1,
          'user-agent':
            'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Mobile Safari/537.36',
        },
      });

      const body = await res.json();

      const { products_and_categories: productsAndCategories } = body;

      if (!productsAndCategories || !productsAndCategories.length) {
        return { message: 'Parsing products', nextState: States.PARSE };
      }



    } catch (error) {
      console.log(error);
      return this._handleParsingErrors([error]);
    }

    return States.DONE;
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    this._logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.PARSE]: this._handleParse,
      [States.MATCH]: this._handleMatch,
      [States.SWAP]: this._handleSwapProxies,
      [States.ERROR]: () => States.STOP,
      [States.DONE]: () => States.STOP,
      [States.ABORT]: () => States.STOP,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }

  // MARK: State Machine Run Loop
  async run() {
    let nextState = this._state;

    if (this._context.aborted || this._context.productFound) {
      nextState = States.ABORT;
      return true;
    }

    try {
      nextState = await this._handleStepLogic(this._state);
    } catch (e) {
      if (!/aborterror/i.test(e.name)) {
        this._logger.verbose('Monitor loop errored out! %s', e);
        nextState = States.ERROR;
        return true;
      }
    }
    this._logger.debug('Monitor Loop finished, state transitioned to: %s', nextState);

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
    let shouldStop = false;

    if (this._context.productFound) {
      this._state = States.STOP;
      shouldStop = true;
    }

    while (this._state !== States.STOP && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.run();
    }

    this._cleanup();
  }
}

module.exports = Monitor;
