/* eslint-disable camelcase */
const _ = require('underscore');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const {
  formatProxy,
  getHeaders,
  now,
  stateForStatusCode,
  waitForDelay,
  userAgent,
} = require('../utils');
const { createCheckoutForm, buildPaymentForm, patchToCart } = require('../utils/forms');
const { States } = require('../utils/constants').TaskRunner;
const { CheckoutTimeouts } = require('../utils/constants').Checkout;
const Checkout = require('../checkout');

/**
 * CHECKOUT STEPS:
 * 1. PAYMENT TOKEN
 * 2. LOGIN (IF NEEDED)
 * 2. CREATE CHECKOUT (POLL QUEUE IF NEEDED AND PROCEED TO #3)
 * 3. PATCH CHECKOUT (POLL QUEUE IF NEEDED AND PROCEED TO #4)
 * 4. MONITOR
 * 5. ADD TO CART (POLL QUEUE IF NEEDED AND PROCEED TO #5)
 * 5. SHIPPING RATES
 * 6. POST CHECKOUT
 * 7. COMPLETE CHECKOUT (IF NEEDED)
 */
class APICheckout extends Checkout {
  async getPaymentToken() {
    const { payment, billing } = this._context.task.profile;
    this._logger.verbose('CHECKOUT: Generating Payment Token');
    try {
      const res = await this._request({
        uri: `https://elb.deposit.shopifycs.com/sessions`,
        method: 'post',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: true,
        resolveWithFullResponse: true,
        json: true,
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
          Connection: 'Keep-Alive',
        },
        body: JSON.stringify(buildPaymentForm(payment, billing)),
      });
      const body = JSON.parse(res.body);
      if (body && body.id) {
        this._logger.verbose('Payment token: %s', body.id);
        this.paymentToken = body.id;
        return { message: 'Creating checkout', nextState: States.CreateCheckout };
      }
      return { message: 'Failed: Generating payment token', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('CHECKOUT: Error getting payment token: %s', err);
      return { message: 'Failed: Generating payment token', nextState: States.Stopped };
    }
  }

  async createCheckout() {
    const { site, monitorDelay } = this._context.task;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/checkout`,
        method: 'POST',
        proxy: formatProxy(this._context.proxy),
        simple: false,
        json: false,
        followAllRedirects: false,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers: getHeaders(site),
        formData: `{}`,
      });

      const { statusCode, body } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }
      const $ = cheerio.load(body, {
        xmlMode: true,
        normalizeWhitespace: true,
      });
      const redirectUrl = $('a').attr('href');

      if (redirectUrl.indexOf('password') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Password page', nextState: States.CreateCheckout };
      }

      if (redirectUrl.indexOf('throttle') > -1 || body.indexOf('{}') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Waiting for queue', nextState: States.PollQueue };
      }
      [, , , this.storeId] = redirectUrl.split('/');
      [, , , , , this.checkoutToken] = redirectUrl.split('/');

      return { message: 'Submiting Information', nextState: States.PatchCheckout };
    } catch (error) {
      this._logger.debug('CHECKOUT: Error creating checkout: %j %d', error, error.statusCode);
      return { message: 'Failed: Creating checkout', nextState: States.Stopped };
    }
  }

  async patchCheckout() {
    const { site, profile } = this._context.task;
    const { shipping, billing, payment } = profile;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        proxy: formatProxy(this._context.proxy),
        simple: false,
        json: false,
        encoding: null,
        followAllRedirects: true,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers: {
          ...getHeaders(site),
          'Accept-Language': 'en-US,en;q=0.8',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Upgrade-Insecure-Requests': '1',
        },
        body: createCheckoutForm(profile, shipping, billing, payment),
      });

      const { statusCode, request } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // check if redirected to `/account/login` page
      if (request && request.uri) {
        const { uri } = request;
        if (uri.href.indexOf('account') > -1) {
          if (this._context.task.username && this._context.task.password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Stopped };
        }
        if (uri.href.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.CreateCheckout };
        }
      }

      if (statusCode >= 200 && statusCode < 310) {
        return { message: 'Monitoring for product', nextState: States.Monitor };
      }
      return { message: 'Failed: Submitting information', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('CHECKOUT: Error creating checkout: %j', err);
      return { message: 'Failed: Creating checkout', nextState: States.Stopped };
    }
  }

  async addToCart() {
    const { site, product, monitorDelay } = this._context.task;
    const { url } = site;

    if (this.checkoutToken) {
      this._logger.verbose('API CHECKOUT: Adding to cart');
      try {
        const res = await this._request({
          uri: `${url}/api/checkouts/${this.checkoutToken}.json`,
          method: 'PATCH',
          proxy: formatProxy(this._context.proxy),
          simple: false,
          json: true,
          rejectUnauthorized: false,
          resolveWithFullResponse: true,
          headers: getHeaders(site),
          body: patchToCart(product.variants[0]),
        });

        const { statusCode } = res;
        const checkStatus = stateForStatusCode(statusCode);
        if (checkStatus) {
          return { message: checkStatus.message, nextState: checkStatus.nextState };
        }

        if (res.body.errors && res.body.errors.line_items[0]) {
          const error = res.body.errors.line_items[0];
          this._logger.debug('Error adding to cart: %j', error);
          if (error.quantity) {
            await waitForDelay(monitorDelay);
            return { message: 'Running for restocks', nextState: States.AddToCart };
          }
          if (error.variant_id && error.variant_id[0]) {
            await waitForDelay(monitorDelay);
            return { message: 'Running for restocks', nextState: States.AddToCart };
          }
          return { message: 'Failed: Add to cart', nextState: States.Stopped };
        }

        if (res.body.checkout && res.body.checkout.line_items.length > 0) {
          this._logger.verbose('Successfully added to cart');
          const { total_price } = res.body.checkout;
          this.prices.item = parseFloat(total_price).toFixed(2);
          this._context.timer.reset();
          this._context.timer.start(now());
          return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
        }
        return { message: 'Failed: Add to cart', nextState: States.Stopped };
      } catch (err) {
        this._logger.debug('API CHECKOUT: Request error adding to cart %j', err);
        return { message: 'Failed: Add to cart', nextState: States.Stopped };
      }
    }
    this._logger.verbose('API CHECKOUT: Invalid checkout session');
    return { message: 'Creating checkout', nextState: States.CreateCheckout };
  }

  async shippingRates() {
    this._logger.verbose('API CHECKOUT: Fetching shipping rates');
    const { site, monitorDelay } = this._context.task;
    const { url } = site;

    if (this._context.timer.getRunTime(now()) > 10000) {
      return { message: 'Failed: Shipping rates timeout', nextState: States.Stopped };
    }

    try {
      const res = await this._request({
        uri: `${url}/api/checkouts/${this.checkoutToken}/shipping_rates.json`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        json: true,
        simple: false,
        headers: getHeaders(site),
      });

      const { statusCode, body } = res;

      // extra check for country not supported
      if (statusCode === 422) {
        return { message: 'Country not supported', nextState: States.Stopped };
      }

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }

      if (body && body.errors) {
        const { errors } = res;
        this._logger.verbose('CHECKOUT: Error getting shipping rates: %j', errors);
        await waitForDelay(monitorDelay);
        return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
      }

      if (body && body.shipping_rates && body.shipping_rates.length > 0) {
        const { shipping_rates: shippingRates } = body;
        shippingRates.forEach(rate => {
          this.shippingMethods.push(rate);
        });

        const cheapest = _.min(this.shippingMethods, rate => rate.price);
        const { id, title } = cheapest;
        this.chosenShippingMethod = { id, name: title };
        this._logger.verbose('CHECKOUT: Using shipping method: %s', this.chosenShippingMethod.name);

        // set shipping price for cart
        let { shipping } = this.prices;
        shipping = parseFloat(cheapest.price).toFixed(2);
        this._logger.silly('CHECKOUT: Shipping total: %s', shipping);
        return {
          message: `Using rate ${this.chosenShippingMethod.name}`,
          nextState: States.PostPayment,
        };
      }
      this._logger.verbose('No shipping rates available, polling %d ms', monitorDelay);
      await waitForDelay(monitorDelay);
      return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error fetching shipping method: %j', err);
      return { message: 'Failed: Fetching shipping rates', nextState: States.Stopped };
    }
  }

  async postPayment() {
    this._logger.verbose('CHECKOUT: Handling post payment step');
    const { site, monitorDelay } = this._context.task;
    const { url, apiKey } = site;
    const headers = {
      ...getHeaders(site),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${apiKey}`,
    };

    const { id } = this.chosenShippingMethod;

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        simple: false,
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        proxy: formatProxy(this._context.proxy),
        headers,
        body: `{"complete":"1","s":"${
          this.paymentToken
        }","checkout":{"shipping_rate":{"id":"${id}"}}}`,
      });

      const { statusCode, body, request } = res;
      fs.writeFileSync(path.join(__dirname, 'test.html'), body);
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // check if redirected
      if (request && request.uri) {
        const { uri } = request;
        if (uri.href.indexOf('processing') > -1) {
          return { message: 'Payment processing', nextState: States.PaymentProcess };
        }
        if (uri.href.indexOf('stock_problems') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.PostPayment };
        }
      }

      return { message: 'Completing checkout', nextState: States.CompletePayment };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error during post payment: %j', err);
      return { message: 'Failed: Posting payment', nextState: States.Stopped };
    }
  }

  async completePayment() {
    this._logger.verbose('API CHECKOUT: Handling review payment step');
    const { site, monitorDelay } = this._context.task;
    const { url, apiKey } = site;

    const headers = {
      ...getHeaders(site),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${apiKey}`,
    };

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        simple: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        proxy: formatProxy(this._context.proxy),
        headers,
        body: `{"complete":"1"}`,
      });

      const { statusCode, request } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // check if redirected to something...
      if (request && request.uri) {
        const { uri } = request;
        if (uri.href.indexOf('processing') > -1) {
          return { message: 'Payment processing', nextState: States.PaymentProcess };
        }
        if (uri.href.indexOf('stock_problems') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.PostPayment };
        }
        if (uri.href.indexOf('account') > -1) {
          if (this._context.task.username && this._context.task.password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Stopped };
        }
        if (uri.href.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.CreateCheckout };
        }
      }
      this._context.timer.reset();
      this._context.timer.start(now());
      return { message: 'Processing payment', nextState: States.PaymentProcess };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error during review payment: %j', err);
      return { message: 'Failed: Posting payment review', nextState: States.Stopped };
    }
  }

  async paymentProcessing() {
    const { timer } = this._context;
    const { site, monitorDelay } = this._context.task;
    const { url, apiKey } = site;
    if (timer.getRunTime(now()) > CheckoutTimeouts.ProcessingPayment) {
      return { message: 'Processing timed out, check email', nextState: States.Stopped };
    }

    const headers = {
      ...getHeaders(site),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${apiKey}`,
    };

    try {
      const res = await this._request({
        uri: `${url}/wallets/checkouts/${this.checkoutToken}/payments`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        simple: false,
        json: true,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers,
      });
      const { statusCode, body } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }
      this._logger.verbose('CHECKOUT: Payments object: %j', body);
      const { payments } = body;

      if (body && payments.length > 0) {
        const { payment_processing_error_message } = payments[0];
        this._logger.verbose('CHECKOUT: Payment error: %j', payment_processing_error_message);
        if (payment_processing_error_message) {
          return { message: 'Payment failed', nextState: States.Stopped };
        }
        if (payments[0].transaction && payments[0].transaction.status !== 'success') {
          const { transaction } = payments[0];
          this._logger.verbose('CHECKOUT: Payment error: %j', transaction);
          return { message: 'Payment failed', nextState: States.Stopped };
        }
        return { message: 'Payment successful', nextState: States.Stopped };
      }
      this._logger.verbose('CHECKOUT: Processing payment');
      await waitForDelay(monitorDelay);
      return { message: 'Processing payment', nextState: States.PaymentProcess };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error failed processing payment: %s', err);
      return { message: 'Failed: Processing payment', nextState: States.Stopped };
    }
  }
}
module.exports = APICheckout;
