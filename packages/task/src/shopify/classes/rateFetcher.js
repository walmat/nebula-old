import { pick } from 'lodash';

import { Constants, Utils, Bases } from '../../common';
import { Parse, pickVariant, Forms } from '../utils';
import { Monitor } from '../constants';
import { Parser, getSpecialParser, getParsers } from '../parsers';

const { addToCart } = Forms;
const { getParseType } = Parse;
const { BaseTask } = Bases;
const { rfrl, userAgent } = Utils;
const { Platforms } = Constants;
const { ParseType } = Monitor;

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

  async keywords() {
    let parsed;

    const Parsers = getParsers(this.task.store.url);

    const parsers = Parsers(
      this._monitorRequest,
      this.task,
      this.proxy,
      this.monitorAborter,
      this._logger,
    );

    try {
      parsed = await rfrl(parsers.map(p => p.run()), 'parsers');
    } catch (error) {
      if (!/aborterror/i.test(error.name)) {
        return { nextState: this.states.ERROR, message: error.message || 'No product found' };
      }
    }
    this.task.product.restockUrl = parsed.url;
    this.task.product.variants = parsed.variants.map(v =>
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

    this.task.product.url = `${this.task.store.url}/products/${parsed.handle}`;

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
    this.task.product.restockUrl = fullProductInfo.url;
    this.task.product.variants = fullProductInfo.variants.map(v =>
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

  async special() {
    const { product } = this.task;
    const ParserCreator = getSpecialParser(this.task.store);
    const parseType = getParseType(product, null, Platforms.Shopify);
    const parser = ParserCreator(
      this._monitorRequest,
      parseType,
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
      this.task.product.variants = [{ id: this.task.product.variant }];
      return { nextState: this.states.CART, message: 'Adding to cart' };
    }

    this.task.product.restockUrl = parsed.url;
    this.task.product.variants = parsed.variants.map(v =>
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

    switch (this.parseType) {
      case ParseType.Variant: {
        this._logger.silly('RATE FETCHER: Variant Parsing Detected');
        this.task.product.variants = [{ id: this.task.product.variant }];
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
      store: { name, url },
      product: { variants, hash, restockUrl },
      size,
    } = this.task;

    const variant = await pickVariant(variants, size, url, this._logger, false);

    this._logger.debug('Adding %j to cart', variant);
    if (!variant) {
      return {
        message: 'No size matched! Stopping...',
        nextState: this.states.ERROR,
      };
    }

    const { option, id } = variant;

    this.task.product.size = option;
    try {
      const res = await this._request('/cart/add.js', {
        method: 'POST',
        agent: this.proxy,
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
      store: { url },
      profile: {
        shipping: { country, province, zipCode },
      },
    } = this.task;

    this._logger.silly('fetching rates');

    let res;
    try {
      res = await this._request(
        `/cart/shipping_rates.json?shipping_address[zip]=${zipCode.replace(
          /\s/g,
          '+',
        )}&shipping_address[country]=${country.value.replace(
          /\s/g,
          '+',
        )}&shipping_address[province]=${province ? province.value.replace(/\s/g, '+') : ''}`,
        {
          method: 'GET',
          agent: this.proxy,
          headers: {
            Origin: url,
            'User-Agent': userAgent,
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
      ({ nextState, message } = await this.stateMachine(this.state));
    } catch (e) {
      nextState = this.states.ERROR;
    }

    if (this.state !== nextState) {
      this.state = nextState;
    }

    return { nextState, message };
  }

  async run() {
    let nextState;
    let message;

    this.parseType = getParseType(this.task.product, this.task.store);

    while (nextState !== this.states.ERROR && !this.aborted) {
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
