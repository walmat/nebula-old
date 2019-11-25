/* eslint-disable consistent-return */
/* eslint-disable array-callback-return */
import AbortController from 'abort-controller';
import { isEqual } from 'lodash';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

import { Manager, Task, Platforms, SiteKeyForPlatform } from '../../constants';
import { Task as TaskConstants, Monitor, Regions } from '../utils/constants';
import notification, { Discord, Slack } from '../hooks';
import AsyncQueue from '../../common/asyncQueue';
import Timer from '../../common/timer';
import { ATC, backupForm } from '../utils/forms';
import getHeaders, { getRegion } from '../utils';
import { waitForDelay, getRandomIntInclusive } from '../../common';

const { Events: TaskManagerEvents } = Manager;
const { Events } = Task;
const { States, Types, DelayTypes, HookTypes, HarvestStates } = TaskConstants;
const { ParseType } = Monitor;

// SUPREME
export default class TaskPrimitive {
  get state() {
    return this._state;
  }

  get context() {
    return this._context;
  }

  get platform() {
    return this._platform;
  }

  constructor(context, platform = Platforms.Supreme) {
    this._context = context;
    this._aborter = new AbortController();
    this._signal = this._aborter.signal;
    this._platform = platform;

    // eslint-disable-next-line global-require
    const _fetch = require('fetch-cookie/node-fetch')(fetch, context.jar);
    this._fetch = defaults(_fetch, context.task.site.url, {
      timeout: 10000, // can be overridden as necessary per request
      signal: this._aborter.signal,
    });

    // internals
    this._sentWebhook = false;
    this._delayer = null;
    this._state = States.WAIT_FOR_PRODUCT;
    this._prevState = this._state;
    this._timer = new Timer();
    this._region = getRegion(context.task.site.name);
    this._slug = null;
    this._form = null;

    // context patches...
    this._context.setHarvestState(HarvestStates.idle);

    this._context.events.on(TaskManagerEvents.Abort, this._handleAbort, this);
    this._context.events.on(TaskManagerEvents.ChangeDelay, this._handleDelay, this);
    this._context.events.on(TaskManagerEvents.UpdateHook, this._handleUpdateHooks, this);
    this._context.events.on(TaskManagerEvents.ProductFound, this._handleProduct, this);
  }

  _handleAbort(id) {
    if (id !== this._context.id) {
      return;
    }

    this._context.setAborted(true);
    this._aborter.abort();
    if (this._delayer) {
      this._delayer.clear();
    }
  }

  _handleHarvest(id, token) {
    const { captchaQueue } = this._context;
    if (id !== this._context.id || !captchaQueue) {
      return;
    }

    captchaQueue.insert(token);
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
    if (parseType !== this._context.parseType) {
      return;
    }

    const isSameProductData = await this._compareProductInput(product, parseType);

    if (isSameProductData || id === this._context.id) {
      // merge the two product datas...
      this._context.task.product = {
        ...this._context.task.product,
        ...product,
      };
    }
  }

  _handleDelay(id, delay, type) {
    if (id !== this._context.id) {
      return;
    }

    if (type === DelayTypes.error) {
      this._context.task.errorDelay = delay;
    } else if (type === DelayTypes.monitor) {
      this._context.task.monitorDelay = delay;
    }

    // reset delay to immediately propagate the delay
    if (this._delayer) {
      this._delayer.clear();
    }
  }

  _handleUpdateHooks(id, hook, type) {
    if (id !== this._context.id) {
      return;
    }

    if (type === HookTypes.Discord) {
      const discord = hook ? new Discord(hook) : null;
      this._context.setDiscord(discord);
    } else if (type === HookTypes.Slack) {
      const slack = hook ? new Slack(hook) : null;
      this._context.setSlack(slack);
    }
  }

  _cleanup() {
    this.stopHarvestCaptcha();
  }

  getCaptcha() {
    const { id, harvestState, captchaQueue, logger, events } = this._context;
    if (harvestState === HarvestStates.idle) {
      this._context.setCaptchaQueue(new AsyncQueue());
      this._context.setHarvestState(HarvestStates.start);
      events.on(TaskManagerEvents.Harvest, this._handleHarvest, this);
    }

    if (harvestState === HarvestStates.suspend) {
      this._context.setHarvestState(HarvestStates.start);
    }

    if (harvestState === HarvestStates.start) {
      logger.silly('[DEBUG]: Starting harvest...');
      events.emit(
        TaskManagerEvents.StartHarvest,
        id,
        SiteKeyForPlatform[this._platform],
        'http://www.supremenewyork.com',
        1,
      );
    }

    // return the captcha request
    return captchaQueue.next();
  }

  suspendHarvestCaptcha() {
    const { id, harvestState, logger, events } = this._context;

    if (harvestState !== HarvestStates.start) {
      return;
    }

    logger.silly('[DEBUG]: Suspending harvest...');
    events.emit(
      TaskManagerEvents.StopHarvest,
      id,
      SiteKeyForPlatform[this._platform],
      'http://www.supremenewyork.com',
    );
    this._context.setHarvestState(HarvestStates.suspend);
  }

  stopHarvestCaptcha() {
    const { id, harvestState, captchaQueue, logger, events } = this._context;
    if (harvestState === HarvestStates.start || harvestState === HarvestStates.suspend) {
      captchaQueue.destroy();
      this._context.setCaptchaQueue(null);
      logger.silly('[DEBUG]: Stopping harvest...');
      events.emit(
        TaskManagerEvents.StopHarvest,
        id,
        SiteKeyForPlatform[this._platform],
        'http://www.supremenewyork.com',
      );
      events.removeListener(TaskManagerEvents.Harvest, this._handleHarvest, this);
      this._context.setHarvestState(HarvestStates.stop);
    }
  }

  async _handleError(error = {}, state) {
    const { aborted, logger } = this._context;
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const { status } = error;
    if (!status) {
      return state;
    }

    if (/aborterror/i.test(status)) {
      return States.ABORT;
    }

    const match = /(ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT|ENOTFOUND|ECONNREFUSED|EPROTO)/.exec(
      status,
    );

    if (match) {
      // Check capturing group
      switch (match[1]) {
        case 'ENOTFOUND':
        case 'EPROTO':
        case 'ECONNREFUSED':
        case 'ECONNRESET': {
          return {
            message: 'Proxy banned!',
            nextState: States.SWAP,
          };
        }
        default:
          break;
      }
    }

    if (/(?!([235][0-9]))\d{3}/g.test(status)) {
      this._emitTaskEvent({
        message: `Delaying ${this._context.task.errorDelay}ms (${status})`,
      });
      this._delayer = waitForDelay(this._context.task.errorDelay, this._aborter.signal);
      await this._delayer;
    }

    return state;
  }

  async swapProxies() {
    const { id, proxy, logger, events } = this._context;
    events.emit(Events.SwapTaskProxy, id, proxy);
    return new Promise((resolve, reject) => {
      let timeout;
      const proxyHandler = (_, newProxy) => {
        logger.silly('Reached Proxy Handler, resolving');
        // clear the timeout interval
        clearTimeout(timeout);
        // reset the timeout
        timeout = null;
        // finally, resolve with the new proxy
        resolve(newProxy);
      };
      timeout = setTimeout(() => {
        events.removeListener(Events.ReceiveProxy, proxyHandler);
        logger.silly('Reached Proxy Timeout: should reject? %s', !!timeout);
        // only reject if timeout has not been cleared
        if (timeout) {
          reject(new Error('Timeout'));
        }
      }, 10000); // TODO: Make this a variable delay?
      events.once(Events.ReceiveProxy, proxyHandler);
    });
  }

  // MARK: Event Registration
  registerForEvent(event, callback) {
    const { events } = this._context;
    switch (event) {
      case Events.TaskStatus: {
        events.on(Events.TaskStatus, callback);
        break;
      }
      default:
        break;
    }
  }

  deregisterForEvent(event, callback) {
    const { events } = this._context;
    switch (event) {
      case Events.TaskStatus: {
        events.removeListener(Events.TaskStatus, callback);
        break;
      }
      default: {
        break;
      }
    }
  }

  // MARK: Event Emitting
  _emitEvent(event, payload) {
    const { id, logger, events } = this._context;

    switch (event) {
      // Emit supported events on their specific channel
      case Events.TaskStatus: {
        events.emit(event, [id], payload, event);
        break;
      }
      default: {
        break;
      }
    }
    logger.silly('Event %s emitted: %j', event, payload);
  }

  _emitTaskEvent(payload = {}) {
    const { message } = payload;
    if (message && message !== this._context.message) {
      this._context.setMessage(message);
      this._emitEvent(Events.TaskStatus, { ...payload, type: Types.Normal });
    }
  }

  async _handleSwapProxies() {
    const {
      task: { errorDelay },
      logger,
    } = this._context;
    try {
      logger.silly('Waiting for new proxy...');
      const proxy = await this.swapProxies();

      logger.debug('Proxy in _handleSwapProxies: %j', proxy);
      // Proxy is fine, update the references
      if ((proxy || proxy === null) && this._context.proxy !== proxy) {
        this._context.setLastProxy(this._context.proxy);
        this._context.setProxy(proxy);

        logger.silly('Swap Proxies Handler completed sucessfully: %s', proxy);
        this._emitTaskEvent({
          message: `Swapped proxy to: ${proxy ? proxy.raw : 'localhost'}`,
        });

        logger.debug('Rewinding to state: %s', this._prevState);
        return this._prevState;
      }

      // If we get a null proxy back while our previous proxy was also null.. then there aren't any available
      // We should wait the error delay, then try again
      this._emitTaskEvent({
        message: `No open proxies! Delaying ${errorDelay}ms`,
      });
      this._delayer = waitForDelay(errorDelay, this._aborter.signal);
      await this._delayer;
    } catch (error) {
      logger.error('Swap Proxies Handler completed with errors: %s', error.toString());
      this._emitMonitorEvent({ message: 'Error swapping proxies! Retrying' });
    }

    // Go back to previous state
    return this._prevState;
  }

  async _pickSize() {
    const {
      task: {
        product: { variants, randomInStock },
        size,
      },
      logger,
    } = this._context;

    let grouping = variants;

    if (randomInStock) {
      grouping = grouping.filter(v => v.stock_level);

      // if we filtered all the products out, rewind it to all variants...
      if (!grouping || !grouping.length) {
        grouping = variants;
      }
    }

    if (/random/i.test(size)) {
      return grouping[getRandomIntInclusive(0, grouping.length - 1)];
    }

    const variant = grouping.find(v => {
      // Determine if we are checking for shoe sizes or not
      let sizeMatcher;
      if (/[0-9]+/.test(size)) {
        // We are matching a shoe size
        sizeMatcher = s => new RegExp(`${size}`, 'i').test(s);
      } else {
        // We are matching a garment size
        sizeMatcher = s => !/[0-9]+/.test(s) && new RegExp(`^${size}`, 'i').test(s.trim());
      }

      if (sizeMatcher(v.name)) {
        logger.debug('Choosing variant: %j', v);
        return v;
      }
    });

    if (randomInStock) {
      if (variant) {
        const { stock_level: stockLevel } = variant;
        if (!stockLevel) {
          const checkedGroup = grouping;

          do {
            const newVariant = checkedGroup.pop();
            if (newVariant.stock_level) {
              return newVariant;
            }
          } while (checkedGroup.length);

          if (!checkedGroup.length) {
            return grouping[getRandomIntInclusive(0, grouping.length - 1)];
          }
        }
      } else {
        return grouping[getRandomIntInclusive(0, grouping.length - 1)];
      }
    }

    if (!variant) {
      return null;
    }

    return variant;
  }

  async _handleWaitForProduct() {
    const { aborted, logger } = this._context;
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._context.task.product.variants) {
      const variant = await this._pickSize();
      // maybe we should loop back around?
      if (!variant) {
        this._emitTaskEvent({ message: 'No sizes found' });
        return States.ERROR;
      }
      this._context.task.product.variant = variant;
      return States.ADD_TO_CART;
    }

    this._delayer = waitForDelay(500, this._aborter.signal);
    await this._delayer;

    return States.WAIT_FOR_PRODUCT;
  }

  async generatePooky(region = Regions.US) {
    const lastid = Date.now();
    const { NEBULA_API_BASE } = process.env;

    try {
      const res = await this._fetch(`${NEBULA_API_BASE}/${region}`);

      if (!res.ok) {
        const error = new Error('Unable to fetch cookies');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();
      if (!body || (body && !body.cookies)) {
        const error = new Error('Unable to parse cookies');
        error.status = res.status || res.errno;
        throw error;
      }

      const { jar, task } = this._context;

      jar.setCookieSync(`lastid=${lastid}`, task.site.url);
      return body.cookies.map(cookie => jar.setCookieSync(`${cookie};`, task.site.url));
    } catch (err) {
      throw err;
    }
  }

  async _handleAddToCart() {
    const { aborted, proxy, logger } = this._context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const {
      product: {
        id: st,
        variant: { id: s },
      },
      site: { name },
      monitorDelay,
      forceCaptcha,
    } = this._context.task;

    this._emitTaskEvent({ message: 'Adding to cart' });

    if (!this._pooky) {
      try {
        await this.generatePooky(this._region);
      } catch (error) {
        // TODO!
        console.log(error);
      }
    }

    try {
      const res = await this._fetch(`/shop/${s}/add.json`, {
        method: 'POST',
        agent: proxy,
        headers: {
          ...getHeaders(),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: ATC(s, st, name),
      });

      if (!res.ok) {
        const error = new Error('Failed add to cart');
        error.status = res.status || res.errno;
        throw error;
      }

      // start the padding timer...
      this._timer.start(new Date().getTime());

      const body = await res.json();
      if ((body && !body.length) || (body && body.length && !body[0].in_stock)) {
        this._pooky = false;
        this._emitTaskEvent({ message: `Out of stock, delaying ${monitorDelay}ms` });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Adding to cart' });
        return States.ADD_TO_CART;
      }

      if (forceCaptcha && !this.captchaToken) {
        return States.CAPTCHA;
      }

      return States.SUBMIT_CHECKOUT;
    } catch (error) {
      return this._handleError(error, States.ADD_TO_CART);
    }
  }

  async _handleCaptcha() {
    const { aborted, logger, captchaRequest } = this._context;
    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      if (captchaRequest) {
        // cancel the request if it was previously started
        this._context.captchaRequest.cancel('aborted');
      }
      return States.ABORT;
    }

    // start request if it hasn't started already
    if (!captchaRequest) {
      this._emitTaskEvent({ message: 'Waiting for captcha' });
      this._context.setCaptchaRequest(await this.getCaptcha());
    }

    // Check the status of the request
    switch (captchaRequest.status) {
      case 'pending': {
        // waiting for token, sleep for 1s and then return same state to check again
        await new Promise(resolve => setTimeout(resolve, 1000));
        return States.CAPTCHA;
      }
      case 'fulfilled': {
        // token was returned, store it and remove the request
        const { value } = captchaRequest;
        this._context.setCaptchaToken(value);
        this._context.setCaptchaRequest(null);
        // We have the token, so suspend harvesting for now
        this.suspendHarvestCaptcha();

        // proceed to submit checkout
        this._emitTaskEvent({ message: 'Submitting checkout' });
        return States.SUBMIT_CHECKOUT;
      }
      case 'cancelled':
      case 'destroyed': {
        logger.silly('Harvest Captcha status: %s, stopping...', captchaRequest.status);
        return States.ERROR;
      }
      default: {
        logger.silly('Unknown Harvest Captcha status! %s, stopping...', captchaRequest.status);
        return States.ERROR;
      }
    }
  }

  async _handleSubmitCheckout() {
    const {
      task: {
        profile: { payment, shipping, billing, billingMatchesShipping },
        checkoutDelay,
        monitorDelay,
      },
      aborted,
      logger,
      proxy,
    } = this._context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (!this._form) {
      const { id: s } = this._context.task.product.variant;
      const profileInfo = billingMatchesShipping ? shipping : billing;
      this._form = backupForm(this._region, profileInfo, payment, s);

      // patch in the captcha token
      this._form += `&g-recaptcha-response=${this.captchaToken || undefined}`;
    }

    if (!this._pooky) {
      try {
        await this.generatePooky(this._region);
      } catch (error) {
        // TODO!
        console.log(error);
      }
    }

    // stop the padding timer...
    this._timer.stop(new Date().getTime());

    const totalTimeout = checkoutDelay - this._timer.getTotalTime(0);
    if (totalTimeout && totalTimeout > 0) {
      this._emitTaskEvent({ message: `Waiting ${totalTimeout}ms` });
      this._delayer = waitForDelay(totalTimeout, this._aborter.signal);
      await this._delayer;
      this._context.task.checkoutDelay = 0; // set checkout delay to nothing now...
    }

    logger.info('parsed form: %j', this._form);

    this._emitTaskEvent({ message: 'Submitting checkout' });

    try {
      const res = await this._fetch('/checkout.json', {
        method: 'POST',
        agent: proxy,
        headers: {
          ...getHeaders(),
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: this._form,
      });

      if (!res.ok) {
        const error = new Error('Failed submitting checkout');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();
      logger.debug('BODY: %j', body);

      if (body && body.status && /queued/i.test(body.status)) {
        const { slug } = body;
        if (!slug) {
          this._emitTaskEvent({ message: 'Invalid checkout slug' });
          return States.SUBMIT_CHECKOUT;
        }
        // reset form..
        this._form = null;
        this._slug = slug;
        return States.CHECK_STATUS;
      }

      if (body && body.status && /out/i.test(body.status)) {
        this._emitTaskEvent({ message: `Out of stock, delaying ${monitorDelay}ms` });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        this._emitTaskEvent({ message: 'Submitting checkout' });
      }

      if (body && body.status && /dup/i.test(body.status)) {
        this._emitTaskEvent({ message: 'Duplicate order' });
        return States.DONE;
      }

      if (body && body.status && /failed/i.test(body.status)) {
        this._emitTaskEvent({ message: 'Checkout failed' });
        return States.ADD_TO_CART;
      }

      return States.SUBMIT_CHECKOUT;
    } catch (error) {
      if (/invalid json/i.test(error)) {
        return States.ADD_TO_CART;
      }
      return this._handleError(error, States.SUBMIT_CHECKOUT);
    }
  }

  async _handleCheckStatus() {
    const { aborted, logger, proxy, events } = this._context;

    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    this._emitTaskEvent({ message: 'Checking status' });

    try {
      const res = await this._fetch(`/checkout/${this._slug}/status.json`, {
        method: 'GET',
        agent: proxy,
        headers: {
          ...getHeaders(),
          'content-type': 'application/x-www-form-urlencoded',
        },
      });

      if (!res.ok) {
        const error = new Error('Failed checking order status');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();

      if (body && body.status && /failed|out/i.test(body.status)) {
        this._emitTaskEvent({ message: 'Checkout failed' });

        const {
          task: {
            product: {
              name: productName,
              image,
              price,
              currency,
              variant: { name: size },
            },
            site: { name: siteName, url: siteUrl },
            profile: { profileName },
          },
          slack,
          discord,
        } = this._context;

        if (!this._sentWebhook) {
          this._sentWebhook = true;
          const hooks = await notification(slack, discord, {
            success: false,
            product: productName,
            price: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
              price.toString().slice(0, -2),
            ),
            site: { name: siteName, url: siteUrl },
            profile: profileName,
            size,
            image: `${image}`.startsWith('http') ? image : `https:${image}`,
          });

          // emit the webhook event
          events.emit(TaskManagerEvents.Webhook, hooks);
        }

        this._context.setCaptchaToken(null);
        this._context.task.checkoutDelay = 0;

        if (this._region === Regions.US) {
          this._emitTaskEvent({
            message: `Delaying ${this._context.task.monitorDelay}ms`,
          });
          this._delayer = waitForDelay(this._context.task.monitorDelay, this._aborter.signal);
          await this._delayer;

          return States.SUBMIT_CHECKOUT;
        }

        return States.CAPTCHA;
      }

      if (body && body.status && /paid/i.test(body.status)) {
        this._emitTaskEvent({ message: 'Payment successful' });

        const {
          task: {
            product: {
              name: productName,
              image,
              price,
              currency,
              variant: { name: size },
            },
            site: { name: siteName, url: siteUrl },
            profile: { profileName },
          },
          slack,
          discord,
        } = this._context;

        const hooks = await notification(slack, discord, {
          success: true,
          product: productName,
          price: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
            price.toString().slice(0, -2),
          ),
          site: { name: siteName, url: siteUrl },
          profile: profileName,
          size,
          image: `${image}`.startsWith('http') ? image : `https:${image}`,
        });

        events.emit(TaskManagerEvents.Webhook, hooks);
        return States.DONE;
      }

      this._delayer = waitForDelay(1000, this._aborter.signal);
      await this._delayer;

      this._emitTaskEvent({ message: 'Checking status' });

      return States.CHECK_STATUS;
    } catch (error) {
      return this._handleError(error, States.CHECK_STATUS);
    }
  }

  async _handleStepLogic(currentState) {
    const { logger } = this._context;

    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.WAIT_FOR_PRODUCT]: this._handleWaitForProduct,
      [States.ADD_TO_CART]: this._handleAddToCart,
      [States.CAPTCHA]: this._handleCaptcha,
      [States.SUBMIT_CHECKOUT]: this._handleSubmitCheckout,
      [States.CHECK_STATUS]: this._handleCheckStatus,
      [States.SWAP]: this._handleSwapProxies,
      [States.DONE]: () => States.DONE,
      [States.ERROR]: () => States.DONE,
      [States.ABORT]: () => States.DONE,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }

  // MARK: State Machine Methods

  stop() {
    return this._context.setAborted(true);
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
    this._emitTaskEvent({ message: 'Waiting for product' });

    do {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.loop();
    } while (this._state !== States.DONE && !shouldStop);

    this._cleanup();
  }
}

TaskPrimitive.Events = Events;
TaskPrimitive.States = States;
