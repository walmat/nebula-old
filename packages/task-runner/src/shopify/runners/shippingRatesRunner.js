import EventEmitter from 'eventemitter3';
import AbortController from 'abort-controller';
import HttpsProxyAgent from 'https-proxy-agent';
import fetch from 'node-fetch';
import defaults from 'fetch-defaults';
import { CookieJar } from 'tough-cookie';
import Bottleneck from 'bottleneck';

import { createLogger } from '../../common/logger';
import generateVariants from '../classes/utils/generateVariants';
import { rfrl, userAgent } from '../classes/utils';
import { addToCart } from '../classes/utils/forms';
import { ParseType, getParseType } from '../classes/utils/parse';
import { TaskRunner } from '../classes/utils/constants';
import { AtomParser, JsonParser, Parser, XmlParser, getSpecialParser } from '../classes/parsers';

const { Types, Events } = TaskRunner;

const request = require('fetch-cookie')(fetch, new CookieJar());

class ShippingRatesRunner {
  constructor(id, task, proxy, loggerPath, type = Types.ShippingRates) {
    this.id = id;
    this.task = task;
    this.taskId = task.id;
    this.proxy = proxy;
    this._type = type;

    this._logger = createLogger({
      dir: loggerPath,
      name: 'ShippingRateRunner',
      prefix: 'SRR',
    });

    this._limiter = new Bottleneck({
      reservoir: 40, // initial value
      reservoirIncreaseAmount: 2,
      reservoirIncreaseInterval: 1000, // must be divisible by 250
      reservoirIncreaseMaximum: 40,
     
      // also use maxConcurrent and/or minTime for safety
      maxConcurrent: 5,
      minTime: 250 // pick a value that makes sense for your use case
    });

    this.aborted = false;
    this.aborter = new AbortController();

    this._request = defaults(request, this.task.site.url, {
      timeout: 10000, // to be overridden as necessary
      signal: this.aborter.signal, // generic abort signal
    });

    this.monitorAborter = new AbortController();
    this._monitorRequest = defaults(request, this.task.site.url, {
      timeout: 60000,
      signal: this.monitorAborter.signal,
    });

    this.message = null;
    this.rate = null;
    this.shippingRates = [];

    this.states = {
      PARSE: 'PARSE',
      CART: 'CART',
      RATES: 'RATES',
      ERROR: 'ERROR',
      DONE: 'DONE',
    };

    this.state = this.states.PARSE;

    this._events = new EventEmitter();
    this._handleAbort = this._handleAbort.bind(this);
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
        this._events.emit(event, this.id, payload, event);
        break;
      }
      default: {
        break;
      }
    }
    this._logger.silly('Event %s emitted: %j', event, payload);
  }

  _emitTaskEvent(payload = {}) {
    if (payload.message && payload.message !== this.message) {
      this.message = payload.message;
      this._emitEvent(Events.TaskStatus, { ...payload, type: this._type });
    }
  }

  _handleAbort(id) {
    if (id === this.id) {
      this.aborted = true;
      this.aborter.abort();
    }
  }

  _generateVariants(product, random = true) {
    const { sizes, site } = this.task;
    let variant;
    try {
      ({ variant } = generateVariants(product, sizes, site, this._logger, random));
    } catch (err) {
      this._logger.error(
        'RATE FETCHER: Unknown error generating variants: %s',
        err.message,
        err.stack,
      );
      return { message: 'No variants', nextState: this.states.ERROR };
    }
    return { variant };
  }

  async keywords() {
    let parsed;

    const parsers = [
      new AtomParser(
        this._monitorRequest,
        this._limiter,
        this.task,
        this.proxy,
        this.monitorAborter,
        this._logger,
      ),
      new XmlParser(
        this._monitorRequest,
        this._limiter,
        this.task,
        this.proxy,
        this.monitorAborter,
        this._logger
      ),
      new JsonParser(
        this._monitorRequest,
        this._limiter,
        this.task,
        this.proxy,
        this.monitorAborter,
        this._logger,
      ),
    ].map(r => r.run());

    try {
      parsed = await rfrl(parsers, 'parsers');
    } catch (error) {
      if (!/aborterror/i.test(error.name)) {
        return { nextState: this.states.ERROR, message: error.message || 'No product found' };
      }
    }

    const { variant, nextState, message } = this._generateVariants(parsed);

    if (nextState) {
      return { nextState, message };
    }

    this.task.product.variants = [variant];
    this.task.product.url = `${this.task.site.url}/products/${parsed.handle}`;

    return { nextState: this.states.CART, message: 'Adding to cart' };
  }

  async url() {
    const [url] = this.task.product.url.split('?');

    let fullProductInfo;
    try {
      // Try getting full product info
      fullProductInfo = await Parser.getFullProductInfo(
        url,
        this.proxy,
        this._monitorRequest,
        this._logger,
      );
      this.monitorAborter.abort();
    } catch (error) {
      const cont = error.some(e => /aborterror/i.test(e.name));
      if (!cont) {
        return { nextState: this.states.ERROR, message: error.message || 'No product found' };
      }
    }

    const { variant, nextState } = this._generateVariants(fullProductInfo);
    // check for next state (means we hit an error when generating variants)
    if (nextState) {
      return nextState;
    }

    this.task.product.variants = [variant];

    return { nextState: this.states.CART, message: 'Adding to cart' };
  }

  async special() {
    const ParserCreator = getSpecialParser(this.task.site);
    const parser = ParserCreator(
      this._monitorRequest,
      this.task,
      this.proxy,
      this.monitorAborter,
      this._logger,
    );

    let parsed;
    try {
      parsed = await parser.run();
    } catch (errors) {
      return this.states.ERROR;
    }

    if (this.task.product.variant) {
      this.task.product.variants = [this.task.product.variant];
      return { nextState: this.states.CART, message: 'Adding to cart' };
    }

    const { variant, nextState, message } = this._generateVariants(parsed);
    // check for next state (means we hit an error when generating variants)
    
    if (nextState) {
      return { nextState, message };
    }
    this.task.product.variants = [variant];

    return { nextState: this.states.CART, message: 'Adding to cart' };
  }

  async parse() {
    this.parseType = getParseType(this.task.product, this._logger, this.task.site);

    let nextState;
    let message;

    console.log(this.parseType);

    switch (this.parseType) {
      case ParseType.Variant: {
        this._logger.silly('RATE FETCHER: Variant Parsing Detected');
        this.task.product.variants = [this.task.product.variant];
        nextState = this.states.CART;
        break;
      }
      case ParseType.Url: {
        this._logger.silly('RATE FETCHER: Url Parsing Detected');
        ({ nextState, message } = await this.url());
        break;
      }
      case ParseType.Keywords: {
        this._logger.silly('RATE FETCHER: Keyword Parsing Detected');
        ({ nextState, message } = await this.keywords());
        break;
      }
      case ParseType.Special: {
        this._logger.silly('RATE FETCHER: Special Parsing Detected');
        ({ nextState, message } = await this.special());
        break;
      }
      default: {
        this._logger.error('RATE FETCHER: Unable to Monitor Type: %s -- Aborting', this.parseType);
        return { nextState: this.states.ERROR, message: 'Invalid parse type' };
      }
    }
    return { nextState, message };
  }

  async cart() {
    const {
      site: { name },
      product: { variants, hash },
    } = this.task;

    this._logger.silly(`adding ${variants[0]} to cart`);

    let res;
    try {
      res = await this._request('/cart/add.js', {
        method: 'POST',
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addToCart(variants[0], name, hash)),
        agent: this.proxy ? new HttpsProxyAgent(this.proxy.proxy) : null,
      });

      const body = await res.json();

      if (!body || (body && !body.id)) {
        return { nextState: this.states.ERROR, message: 'Cart empty' };
      }

      if (body && /cannot find variant/i.test(body)) {
        return { nextState: this.states.ERROR, message: 'Invalid variant' };
      }

      return { nextState: this.states.RATES, message: 'Fetching rates' };
    } catch (err) {
      return { nextState: this.states.ERROR, message: err.message || 'Failed cart' };
    }
  }

  async rates() {
    const {
      site: { url },
      profile: {
        shipping: { country, province, zipCode },
      },
    } = this.task;

    this._logger.silly('fetching rates');

    let res;
    try {
      res = await this._request(
        `/cart/shipping_rates.json?shipping_address[zip]=${zipCode}&shipping_address[country]=${
          country.value
        }&shipping_address[province]=${province ? province.value : ''}`,
        {
          method: 'GET',
          agent: this.proxy ? new HttpsProxyAgent(this.proxy.proxy) : null,
          headers: {
            Origin: url,
            'User-Agent': userAgent,
          },
        },
      );

      const { status } = res;

      if (status === 422) {
        return { message: 'Country not supported', nextState: States.Errored };
      }

      const body = await res.json();

      if (body && (!body.shipping_rates || !body.shipping_rates.length)) {
        return { nextState: this.states.RATES, message: 'Polling for rates' };
      }

      const { shipping_rates: shippingRates } = body;
      shippingRates.forEach(rate => {
        const { name, price, source, code } = rate;
        const newRate = {
          title: name,
          price,
          id: encodeURIComponent(`${source}-${code}-${price}`),
        };

        if (!this.rate || parseFloat(price) < parseFloat(this.shippingRates.price)) {
          this.rate = newRate;
        }
        this.shippingRates.push(newRate);
      });

      return { nextState: this.states.DONE, message: 'Rates found!' };
    } catch (err) {
      return { nextState: this.states.ERROR, message: err.message || 'Failed rates' };
    }
  }

  async stateMachine(curr) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    const stateMap = {
      [this.states.PARSE]: this.parse,
      [this.states.CART]: this.cart,
      [this.states.RATES]: this.rates,
    };

    const handler = stateMap[curr] || defaultHandler;

    return handler.call(this);
  }

  async run() {
    let nextState;
    let message;

    try {
      ({ nextState, message } = await this.stateMachine(this.state));
    } catch (e) {
      nextState = this.states.ERROR;
    }

    if (this.state !== nextState) {
      this.state = nextState;
    }

    return { nextState, message };
  }

  async start() {
    let nextState;
    let message;
    while (nextState !== this.states.ERROR && !this.aborted) {
      // eslint-disable-next-line no-await-in-loop
      ({ nextState, message } = await this.run());

      console.log(nextState, message);

      console.log('SHIPPING RATES LENGTH: ', this.shippingRates.length);
      if (this.shippingRates.length) {
        this._emitTaskEvent({
          message: 'Rates found!',
          done: true,
          rates: this.shippingRates,
          selected: this.rate,
        });
        return;
      }
    }

    if (!this.shippingRates.length) {
      this._emitTaskEvent({ message: message || 'No shipping rates', done: true });
    }
  }
}

module.exports = ShippingRatesRunner;
