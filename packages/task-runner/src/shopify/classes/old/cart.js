/**
 * Parse includes
 */
const cheerio = require('cheerio');
const now = require('performance-now');
const _ = require('underscore');

/**
 * Form includes
 */
const { buildCartForm } = require('../utils/forms');

/**
 * Utils includes
 */
const { formatProxy, userAgent } = require('../utils');

class Cart {
  constructor(context, timer, request) {
    /**
     * All data needed for monitor to run
     * This includes:
     * - current runner id
     * - current task
     * - current proxy
     * - whether or not we should abort
     * @type {TaskRunnerContext}
     */
    this._context = context;
    this._timer = timer;
    this._request = request;

    this._task = this._context.task;
    this._runnerID = this._context.runner_id;
    this._proxy = this._context.proxy;
    this._aborted = this._context.aborted;
    this._logger = this._context.logger;

    this._price = 0;

    this.CART_STATES = {
      CheckoutQueue: 'CHECKOUT_QUEUE',
      OutOfStock: 'OUT_OF_STOCK',
      Success: 'SUCCESS',
    };
  }

  addToCart(variant) {
    this._timer.start(now());
    this._logger.verbose('Starting add to cart...');
    return this._request({
      uri: `${this._task.site.url}/cart/add.js`,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      simple: false,
      json: true,
      proxy: formatProxy(this._proxy),
      method: 'post',
      headers: {
        Origin: this._task.site.url,
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.8',
      },
      formData: buildCartForm(this._task, variant),
    })
      .then(res => {
        if (res.body.status === 404) {
          this._logger.debug('CART: Error in add to cart response: %s', res.body.description);
          return {
            errors: res.body.description,
          };
        }
        this._price = Number.parseInt(this.removeTrailingZeros(res.body.line_price), 10);
        this._task.product.url = `${this._task.site.url}/${res.body.url.split('?')[0]}`;
        this._timer.stop(now());
        this._logger.info('Added to cart in %d ms', this._timer.getRunTime());
        return true;
      })
      .catch(err => {
        this._logger.debug('CART: Error in add to cart: %s', err);
        return {
          errors: err,
        };
      });
  }

  createCheckout() {
    return this._request({
      uri: `${this._task.site.url}/wallets/checkouts.json`,
      method: 'post',
      proxy: formatProxy(this._proxy),
      followAllRedirects: true,
      simple: false,
      json: true,
      rejectUnauthorized: false,
      resolveWithFullResponse: true,
      headers: {
        'User-Agent': userAgent,
        Host: `${this._task.site.url}`,
        'Content-Type': 'application/json',
      },
      formData: JSON.stringify({
        checkout: {
          email: this._task.profile.payment.email,
          line_items: [
            {
              variant_id: 16907588960325,
              quantity: 1,
            },
          ],
          shipping_address: {
            first_name: this._task.profile.shipping.firstName,
            last_name: this._task.profile.shipping.lastName,
            address1: this._task.profile.shipping.address,
            city: this._task.profile.shipping.city,
            province_code: this._task.profile.shipping.state,
            country_code: this._task.profile.shipping.country,
            phone: this._task.profile.shipping.phone,
            zip: this._task.profile.shipping.zipCode,
          },
        },
      }),
    }).then(res => res.body);
  }

  proceedToCheckout() {
    this._timer.start(now());
    this._logger.verbose('Starting proceed to checkout request...');
    return this._request({
      uri: `${this._task.site.url}//checkout.json`,
      method: 'get',
      proxy: formatProxy(this._proxy),
      followAllRedirects: true,
      simple: true,
      json: false,
      resolveWithFullResponse: true,
      headers: {
        'User-Agent': userAgent,
      },
    })
      .then(res => {
        if (res.request.href.indexOf('throttle') > -1) {
          this._logger.info('Waiting in checkout queue...');
          return {
            state: this.CART_STATES.CheckoutQueue,
          };
        }
        if (res.request.href.indexOf('stock_problems') > -1) {
          this._logger.info('Hit out of stock page...');
          return {
            state: this.CART_STATES.OutOfStock,
          };
        }
        this._timer.stop(now());
        this._logger.info('Got to checkout in %d ms', this._timer.getRunTime());
        const $ = cheerio.load(res.body);
        return {
          state: this.CART_STATES.Success,
          checkoutUrl: res.request.href,
          authToken: $('form input[name=authenticity_token]').attr('value'),
        };
      })
      .catch(err => {
        this._logger.debug('CART: Error in proceed to checkout: %s', err);
        return {
          errors: err,
        };
      });
  }

  clearCart() {
    this._timer.start(now());
    this._logger.verbose('CART: Starting clear cart request...');
    return this._request({
      uri: `${this._task.site.url}/cart/clear.js`,
      proxy: formatProxy(this._proxy),
      followAllRedirects: true,
      json: true,
      method: 'POST',
      headers: {
        Origin: this._task.site.url,
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        Referer: this._task.product.url,
        'Accept-Language': 'en-US,en;q=0.8',
      },
    })
      .then(res => {
        this._timer.stop(now());
        this._logger.debug('CART: Cleared cart in %d ms', this._timer.getRunTime());
        return {
          cleared: res.item_count === 0,
          errors: null,
        };
      })
      .catch(err => {
        this._logger.debug('CART: Error clearing cart: %s', err);
        return {
          errors: err,
        };
      });
  }

  async getEstimatedShippingRates() {
    this._timer.start(now());
    this._logger.verbose('Starting get shipping method request...');
    const form = {
      'shipping_address[zip]': this._task.profile.shipping.zipCode,
      'shipping_address[country]': this._task.profile.shipping.country.label,
      'shipping_address[province]': this._task.profile.shipping.state.label,
    };

    return this._request({
      uri: `${this._task.site.url}/cart/shipping_rates.json`,
      proxy: formatProxy(this._proxy),
      followAllRedirects: true,
      method: 'get',
      headers: {
        Origin: this._task.site.url,
        'User-Agent': userAgent,
        Referer: this._task.product.url,
      },
      qs: form,
    })
      .then(res => {
        const rates = JSON.parse(res);
        // filter this more efficiently
        const shippingMethod = _.min(rates.shipping_rates, rate => rate.price);

        this._timer.stop(now());
        this._logger.info('Got shipping method in %d ms', this._timer.getRunTime());
        return {
          rate: `shopify-${shippingMethod.name.replace('%20', ' ')}-${shippingMethod.price}`,
          name: `${shippingMethod.name}`,
          price: `${shippingMethod.price.split('.')[0]}`,
        };
      })
      .catch(err => {
        this._logger.debug('CART: Error getting shipping method: %s', err);
        return {
          errors: err,
        };
      });
  }

  static removeTrailingZeros(value) {
    const price = [];
    const newVal = value.toString().split('');
    for (let i = 0; i < newVal.length; i += 1) {
      // remove last two zeroes
      if (i < newVal.length - 2) {
        price.push(newVal[i]);
      }
    }
    return price.join('');
  }
}
module.exports = Cart;
