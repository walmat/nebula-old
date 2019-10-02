/* eslint-disable consistent-return */
/* eslint-disable array-callback-return */
import AbortController from 'abort-controller';
import HttpsProxyAgent from 'https-proxy-agent';
import { isEqual } from 'lodash';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';

const TaskManagerEvents = require('../../constants').Manager.Events;
const Discord = require('../classes/hooks/discord');
const Slack = require('../classes/hooks/slack');
const { notification } = require('../classes/hooks');
const AsyncQueue = require('../../common/asyncQueue');
const { waitForDelay, getRandomIntInclusive } = require('../../common');
const { Events } = require('../../constants').Runner;
const {
  TaskRunner: { States, Types, DelayTypes, HookTypes, HarvestStates },
  Monitor: { ParseType },
} = require('../utils/constants');

// SUPREME
class TaskRunner {
  constructor(context, proxy, type) {
    this.id = context.id;
    this._task = context.task;
    this.taskId = context.taskId;
    this._events = context.events;
    this._aborter = new AbortController();
    this._signal = this._aborter.signal;
    this.proxy = proxy;
    this._parseType = type;

    // eslint-disable-next-line global-require
    const _request = require('fetch-cookie')(fetch, context.jar);
    this._request = defaults(_request, this._task.site.url, {
      timeout: 10000, // to be overridden as necessary
      signal: this._aborter.signal, // generic abort signal
    });

    this._delayer = null;
    this._captchaQueue = null;
    this._state = States.WAIT_FOR_PRODUCT;

    this._discord = new Discord(this._task.discord);
    this._slack = new Slack(this._task.slack);
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
      slack: this._slack,
      logger: this._logger,
      harvestState: HarvestStates.idle,
    };

    this._history = [];
    this._slug = null;
    this._pooky = false;
    this.captchaToken = '';
    this._cookies = '';

    this._handleAbort = this._handleAbort.bind(this);
    this._handleDelay = this._handleDelay.bind(this);
    this._handleProduct = this._handleProduct.bind(this);

    this._events.on(TaskManagerEvents.Abort, this._handleAbort, this);
    this._events.on(TaskManagerEvents.ChangeDelay, this._handleDelay, this);
    this._events.on(TaskManagerEvents.UpdateHook, this._handleUpdateHooks, this);
    this._events.on(TaskManagerEvents.ProductFound, this._handleProduct, this);
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
        // patch checkout context
        this._context.productFound = true;
      }
    }
  }

  _handleDelay(id, delay, type) {
    console.log(id, this._context.id, delay, type);
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

  async _handleFetchErrors(errors, state) {
    if (this._context.aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    errors.forEach(({ status }) => {
      if (!status) {
        return;
      }

      if (/aborterror/i.test(status)) {
        return States.ABORT;
      }

      const match = /(ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT|ENOTFOUND|ECONNREFUSED)/.exec(status);

      if (match) {
        // Check capturing group
        switch (match[1]) {
          // connection reset
          case 'ENOTFOUND':
          case 'ECONNREFUSED':
          case 'ECONNRESET': {
            return {
              message: 'Swapping proxy',
              nextState: States.SWAP,
            };
          }
          default:
            return state;
        }
      }
    });

    return state;
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
        this._context.proxy = new HttpsProxyAgent(proxy.proxy);
        this._checkout._context.proxy = new HttpsProxyAgent(proxy.proxy);
        this._context.rawProxy = proxy.raw;
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

  async _pickSize() {
    const {
      product: { variants },
      size,
      randomInStock,
    } = this._context.task;

    let grouping = variants;

    if (randomInStock) {
      grouping = grouping.filter(v => v.stock_level);

      // if we filtered all the products out, rewind it...
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
        this._logger.debug('Choosing variant: %j', v);
        return v;
      }
    });

    if (randomInStock) {
      if (variant) {
        const { stock_level: stockLevel } = variant;
        // should we do a `do...while` here?
        if (!stockLevel) {
          return grouping[getRandomIntInclusive(0, grouping.length - 1)];
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
    if (this._context.aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    if (this._context.productFound) {
      const variant = await this._pickSize();
      // loop back around?
      if (!variant) {
        this._emitTaskEvent({ message: 'Size not found' });
        return States.ERROR;
      }
      this._context.task.product.variant = variant;
      return States.ADD_TO_CART;
    }

    this._delayer = waitForDelay(500, this._aborter.signal);
    await this._delayer;

    return States.WAIT_FOR_PRODUCT;
  }

  async generatePooky(region = 'US') {
    return new Promise(async (resolve, reject) => {
      const lastid = Date.now();

      const { NEBULA_API_BASE, NEBULA_API_UUID } = process.env;
      const res = await this._request(
        `${NEBULA_API_BASE}/${region}?auth=nebula-${NEBULA_API_UUID}`,
      );

      if (!res.ok) {
        const error = new Error('Unable to fetch cookies');
        error.status = res.status || res.errno;
        reject(error);
      }

      const body = await res.json();

      if (!body || (body && !body.cookies)) {
        const error = new Error('Unable to fetch cookies');
        error.status = res.status || res.errno;
        reject(error);
      }

      this._cookies = body.cookies;
      // this._logger.info(this._cookies);

      this._context.jar.setCookieSync(`lastid=${lastid}`, this._context.task.site.url);
      body.cookies.map(cookie =>
        this._context.jar.setCookieSync(`${cookie};`, this._context.task.site.url),
      );

      resolve(true);
    });
  }

  async _handleAddToCart() {
    const { aborted, proxy } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
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
      if (/US/i.test(name)) {
        this._pooky = await this.generatePooky('US');
      }
      if (/EU/i.test(name)) {
        this._pooky = await this.generatePooky('EU');
      }
      if (/JP/i.test(name)) {
        this._pooky = await this.generatePooky('JP');
      }
    }

    try {
      const res = await this._request(`/shop/${s}/add.json`, {
        method: 'POST',
        agent: proxy,
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
          'content-type': 'application/x-www-form-urlencoded',
          origin: 'https://www.supremenewyork.com',
          referer: 'https://www.supremenewyork.com/mobile',
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        },
        body: `s=${s}&st=${st}&qty=1`,
      });

      if (!res.ok) {
        const error = new Error('Failed add to cart');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();

      if (body && !body.length) {
        this._pooky = false;
        this._emitTaskEvent({ message: `Out of stock, delaying ${monitorDelay}ms` });
        this._delayer = waitForDelay(monitorDelay, this._aborter.signal);
        await this._delayer;
        return States.ADD_TO_CART;
      }

      if (forceCaptcha && !this.captchaToken) {
        return States.CAPTCHA;
      }

      return States.SUBMIT_CHECKOUT;
    } catch (error) {
      return this._handleFetchErrors([error], States.ADD_TO_CART);
    }
  }

  async _handleCaptcha() {
    const { aborted } = this._context;
    // exit if abort is detected
    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      if (this._checkout.captchaTokenRequest) {
        // cancel the request if it was previously started
        this._checkout.captchaTokenRequest.cancel('aborted');
      }
      return States.ABORT;
    }

    // start request if it hasn't started already
    if (!this._checkout.captchaTokenRequest) {
      this._emitTaskEvent({ message: 'Waiting for captcha' });
      this._checkout.captchaTokenRequest = await this.getCaptcha();
    }

    // Check the status of the request
    switch (this._checkout.captchaTokenRequest.status) {
      case 'pending': {
        // waiting for token, sleep for delay and then return same state to check again
        await new Promise(resolve => setTimeout(resolve, 2000));
        return States.CAPTCHA;
      }
      case 'fulfilled': {
        // token was returned, store it and remove the request
        ({ value: this._checkout.captchaToken } = this._checkout.captchaTokenRequest);
        this._checkout.captchaTokenRequest = null;
        // We have the token, so suspend harvesting for now
        this.suspendHarvestCaptcha();

        // proceed to submit checkout
        return States.SUBMIT_CHECKOUT;
      }
      case 'cancelled':
      case 'destroyed': {
        this._logger.silly(
          'Harvest Captcha status: %s, stopping...',
          this._checkout.captchaTokenRequest.status,
        );
        // clear out the status so we get a generic "errored out task event"
        this._context.status = null;
        return States.ERROR;
      }
      default: {
        this._logger.silly(
          'Unknown Harvest Captcha status! %s, stopping...',
          this._checkout.captchaTokenRequest.status,
        );
        // clear out the status so we get a generic "errored out task event"
        this._context.status = null;
        return States.ERROR;
      }
    }
  }

  async _handleSubmitCheckout() {
    const {
      task: {
        profile: { payment, billing },
        site: { name },
        checkoutDelay,
      },
      aborted,
      proxy,
    } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    const {
      variant: { id: s },
    } = this._context.task.product;

    const fullName = `${billing.firstName.replace(/\s/g, '+')}+${billing.lastName.replace(
      /\s/g,
      '+',
    )}`;
    const card = payment.cardNumber.match(/.{1,4}/g).join('+');
    const month = payment.exp.slice(0, 2);
    const year = `20${payment.exp.slice(3, 5)}`;
    const country = /US/i.test(name) ? 'USA' : '';
    // TOOD: format phone?, figure out EU country
    const cookieSub = JSON.stringify({ [s]: 1 });

    let form = `store_credit_id=&from_mobile=1&cookie-sub=${encodeURIComponent(
      cookieSub,
    )}&same_as_billing_address=1&order%5Bbilling_name%5D=${fullName}&order%5Bemail%5D=${encodeURIComponent(
      payment.email,
    )}&order%5Btel%5D=${billing.phone}&order%5Bbilling_address%5D=${billing.address.replace(
      /\s/g,
      '+',
    )}&order%5Bbilling_address_2%5D=${
      billing.apt ? billing.apt.replace(/\s/g, '+') : ''
    }&order%5Bbilling_zip%5D=${billing.zipCode}&order%5Bbilling_city%5D=${billing.city.replace(
      /\s/g,
      '+',
    )}&order%5Bbilling_state%5D=${
      billing.province ? billing.province.value.replace(/\s/g, '+') : ''
    }&order%5Bbilling_country%5D=${country}&carn=${card}&credit_card%5Bmonth%5D=${month}&credit_card%5Byear%5D=${year}&credit_card%5Bvvv%5D=${
      payment.cvv
    }&order%5Bterms%5D=0&order%5Bterms%5D=1`;

    if (this.captchaToken) {
      form += `g-recaptcha-response=${this.captchaToken}`;
    }

    if (checkoutDelay) {
      this._emitTaskEvent({ message: `Waiting ${checkoutDelay}ms` });
      this._delayer = waitForDelay(checkoutDelay, this._aborter.signal);
      await this._delayer;
    }

    this._emitTaskEvent({ messge: 'Submitting checkout' });

    try {
      const res = await this._request('/checkout.json', {
        method: 'POST',
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
          'content-type': 'application/x-www-form-urlencoded',
          origin: 'https://www.supremenewyork.com',
          referer: 'https://www.supremenewyork.com/mobile',
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        },
        body: form,
      });

      // no matter what, set pooky back to false
      this._pooky = false;
      this._cookies = '';

      if (!res.ok) {
        const error = new Error('Failed submitting checkout');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();

      if (body && body.status && /queue/i.test(body.status)) {
        const { slug } = body;
        if (!slug) {
          this._emitTaskEvent({ message: 'Invalid checkout slug' });
          return States.SUBMIT_CHECKOUT;
        }
        this._slug = slug;
        return States.CHECK_STATUS;
      }

      if (body && body.status && /dup/i.test(body.status)) {
        this._emitTaskEvent({ message: 'Duplicate order!' });
        return States.DONE;
      }

      return States.SUBMIT_CHECKOUT;
    } catch (error) {
      return this._handleFetchErrors([error], States.SUBMIT_CHECKOUT);
    }
  }

  async _handleCheckStatus() {
    const { aborted, proxy } = this._context;

    if (aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    this._emitTaskEvent({ message: 'Checking order status' });

    try {
      const res = await this._request(`/checkout/${this._slug}/status.json`, {
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
          'content-type': 'application/x-www-form-urlencoded',
          origin: 'https://www.supremenewyork.com',
          referer: 'https://www.supremenewyork.com/mobile',
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        },
      });

      if (!res.ok) {
        const error = new Error('Failed checking order status');
        error.status = res.status || res.errno;
        throw error;
      }

      const body = await res.json();

      if (body && body.status && /failed/i.test(body.status)) {
        this._emitTaskEvent({ message: 'Checkout failed!' });

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

        this._events.emit(TaskManagerEvents.Webhook, hooks);
        return States.DONE;
      }

      if (body && body.status && /paid/i.test(body.status)) {
        this._emitTaskEvent({ message: 'Payment successful!' });

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

        this._events.emit(TaskManagerEvents.Webhook, hooks);
        return States.DONE;
      }

      this._delayer = waitForDelay(1000, this._aborter.signal);
      await this._delayer;

      return States.CHECK_STATUS;
    } catch (error) {
      return this._handleFetchErrors([error], States.CHECK_STATUS);
    }
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
      return States.DONE;
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
      [States.CAPTCHA]: this._handleCaptcha,
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
      return true;
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
    while (this._state !== States.DONE && !shouldStop) {
      // eslint-disable-next-line no-await-in-loop
      shouldStop = await this.run();
    }

    this._cleanup();
  }
}

TaskRunner.Events = Events;
TaskRunner.States = States;

module.exports = TaskRunner;
