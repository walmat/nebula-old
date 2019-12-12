import AbortController from 'abort-controller';
import { pick } from 'lodash';

import { Constants, Utils, Bases } from '../../common';
import { pickVariant, Forms, Parse } from '../utils';
import { getParsers } from '../parsers';

const { getFullProductInfo } = Parse;
const { addToCart } = Forms;
const { BaseTask } = Bases;
const { rfrl, userAgent } = Utils;
const {
  Platforms,
  Task: { Events },
  Monitor: { ParseType },
} = Constants;

export default class RateFetcher extends BaseTask {
  constructor(context, platform = Platforms.Shopify) {
    super(context, platform);
    this.rate = null;
    this.shippingRates = [];

    this.states = {
      PARSE: 'PARSE',
      CART: 'CART',
      RATES: 'RATES',
      ERROR: 'ERROR',
      DONE: 'DONE',
    };

    this._state = this.states.PARSE;
  }

  // MARK: Event Emitting
  _emitEvent(event, payload) {
    switch (event) {
      // Emit supported events on their specific channel
      case Events.TaskStatus: {
        this.context.events.emit(event, [this.context.id], payload, event);
        break;
      }
      default: {
        break;
      }
    }
    this.context.logger.silly('Event %s emitted: %j', event, payload);
  }

  _emitTaskEvent(payload = {}) {
    if (payload.message && payload.message !== this.message) {
      this.message = payload.message;
      this._emitEvent(Events.TaskStatus, { ...payload, type: this.context.type });
    }
  }

  async keywords() {
    let parsed;

    const { task, proxy, logger, parseType } = this.context;

    const Parsers = getParsers(task.store.url);
    const parsers = Parsers(this._fetch, parseType, task, proxy, new AbortController(), logger);

    try {
      parsed = await rfrl(parsers.map(p => p.run()), 'parsers');
    } catch (error) {
      if (!/aborterror/i.test(error.name)) {
        return { nextState: this.states.ERROR, message: error.message || 'No product found' };
      }
    }

    this.context.task.product.restockUrl = parsed.url;
    this.context.task.product.variants = parsed.variants.map(v =>
      pick(
        v,
        'id',
        'product_id',
        'title',
        'available',
        'price',
        'option1',
        'option2',
        'option3',
        'option4',
      ),
    );

    this.context.task.product.url = `${this.context.task.store.url}/products/${parsed.handle}`;

    return { nextState: this.states.CART, message: 'Adding to cart' };
  }

  async url() {
    const { task, proxy, logger } = this.context;

    const [url] = task.product.url.split('?');

    let fullProductInfo;
    try {
      // Try getting full product info
      fullProductInfo = await getFullProductInfo(this._fetch, url, proxy, logger);
    } catch (error) {
      const cont = error.some(e => /aborterror/i.test(e.name));
      if (!cont) {
        return { nextState: this.states.ERROR, message: error.message || 'No product found' };
      }
    }
    this.context.task.product.restockUrl = fullProductInfo.url;
    this.context.task.product.variants = fullProductInfo.variants.map(v =>
      pick(
        v,
        'id',
        'product_id',
        'title',
        'available',
        'price',
        'option1',
        'option2',
        'option3',
        'option4',
      ),
    );

    return { nextState: this.states.CART, message: 'Adding to cart' };
  }

  async parse() {
    let nextState;
    let message;

    const { parseType, logger } = this.context;

    switch (parseType) {
      case ParseType.Variant: {
        logger.silly('RATE FETCHER: Variant Parsing Detected');
        this.context.task.product.variants = [{ id: this.context.task.product.variant }];
        nextState = this.states.CART;
        break;
      }
      case ParseType.Url: {
        logger.silly('RATE FETCHER: Url Parsing Detected');
        ({ nextState, message } = await this.url());
        break;
      }
      case ParseType.Keywords: {
        logger.silly('RATE FETCHER: Keyword Parsing Detected');
        ({ nextState, message } = await this.keywords());
        break;
      }
      default: {
        logger.error('RATE FETCHER: Unable to Monitor Type: %s -- Aborting', parseType);
        return { nextState: this.states.ERROR, message: 'Invalid parse type' };
      }
    }
    return { nextState, message };
  }

  async cart() {
    const {
      task: {
        store: { name, url },
        product: { variants, hash, restockUrl },
        size,
      },
      proxy,
      logger,
    } = this.context;

    const variant = await pickVariant(variants, size, url, logger, false);

    logger.debug('Adding %j to cart', variant);
    if (!variant) {
      return {
        message: 'No size matched! Stopping...',
        nextState: this.states.ERROR,
      };
    }

    const { option, id } = variant;

    this.context.task.product.size = option;
    try {
      const res = await this._fetch('/cart/add.js', {
        method: 'POST',
        agent: proxy ? proxy.proxy : null,
        headers: {
          'user-agent': userAgent,
          referer: restockUrl,
          origin: url,
          host: `${url.split('/')[2]}`,
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/json',
        },
        body: addToCart(id, name, hash),
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
      task: {
        store: { url },
        profile: {
          shipping: { country, province, zip },
        },
      },
      logger,
      proxy,
    } = this.context;

    logger.silly('fetching rates');

    let res;
    try {
      res = await this._fetch(
        `/cart/shipping_rates.json?shipping_address[zip]=${zip.replace(
          /\s/g,
          '+',
        )}&shipping_address[country]=${country.value.replace(
          /\s/g,
          '+',
        )}&shipping_address[province]=${province ? province.value.replace(/\s/g, '+') : ''}`,
        {
          method: 'GET',
          agent: proxy ? proxy.proxy : null,
          headers: {
            origin: url,
            'user-agent': userAgent,
          },
        },
      );

      const { status } = res;
      const body = await res.json();

      if (status === 422) {
        return { message: 'Country not supported / Cart error', nextState: this.states.ERROR };
      }

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

  async loop() {
    let nextState;
    let message;

    try {
      ({ nextState, message } = await this.stateMachine(this._state));
    } catch (e) {
      nextState = this.states.ERROR;
    }

    if (this._state !== nextState) {
      this._state = nextState;
    }

    return { nextState, message };
  }

  async run() {
    let nextState;
    let message;

    const { aborted } = this._context;

    while (nextState !== this.states.ERROR && !aborted) {
      // eslint-disable-next-line no-await-in-loop
      ({ nextState, message } = await this.loop());

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
