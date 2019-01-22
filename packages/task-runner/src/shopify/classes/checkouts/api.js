const _ = require('underscore');

const {
  formatProxy,
  getHeaders,
  now,
  stateForStatusCode,
  userAgent,
  waitForDelay,
} = require('../utils');
const { createCheckoutForm } = require('../utils/forms');
const { buildPaymentForm, patchToCart } = require('../utils/forms');
const { States } = require('../utils/constants').TaskRunner;
const Checkout = require('../checkout');

/**
 * CHECKOUT STEPS:
 * 1. LOGIN (IF NEEDED)
 * 2. PAYMENT TOKEN
 * 3. CREATE CHECKOUT (POLL QUEUE IF NEEDED AND PROCEED TO #4)
 * 4. PATCH CHECKOUT (POLL QUEUE IF NEEDED AND PROCEED TO #5)
 * 5. MONITOR
 * 6. ADD TO CART (POLL QUEUE IF NEEDED AND PROCEED TO #7)
 * 7. SHIPPING RATES
 * 8. POST CHECKOUT
 * 9. COMPLETE CHECKOUT (IF NEEDED)
 * 10. PROCESSING...
 */
class APICheckout extends Checkout {
  async getPaymentToken() {
    const { payment, billing } = this._context.task.profile;

    this._logger.verbose('API CHECKOUT: Creating payment token');
    try {
      const res = await this._request({
        uri: `https://elb.deposit.shopifycs.com/sessions`,
        method: 'POST',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: true,
        resolveWithFullResponse: true,
        json: true,
        simple: true,
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
          Connection: 'Keep-Alive',
        },
        formData: JSON.stringify(buildPaymentForm(payment, billing)),
      });
      const { body } = res;
      if (body && body.id) {
        const { id } = body;
        this._logger.verbose('Payment token: %s', id);
        this.paymentToken = id;
        return { message: 'Creating checkout', nextState: States.CreateCheckout };
      }
      return { message: 'Failed: Creating payment token', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('API CHECKOUT: Request error getting payment token: %j', err);
      return { message: 'Failed: Creating payment token', nextState: States.Stopped };
    }
  }

  async patchCheckout() {
    const { site, profile, monitorDelay } = this._context.task;
    const { shipping, billing, payment } = profile;
    const { url } = site;

    this._logger.verbose('API CHECKOUT: Patching checkout');
    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        json: false,
        headers: {
          ...getHeaders(site),
          'Accept-Language': 'en-US,en;q=0.8',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Upgrade-Insecure-Requests': '1',
        },
        body: createCheckoutForm(profile, shipping, billing, payment),
      });

      const { statusCode, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.location;
      this._logger.verbose('API CHECKOUT: Patch checkout redirect url: %s', redirectUrl);
      if (!redirectUrl) {
        if (statusCode === 200) {
          return { message: 'Monitoring for product', nextState: States.Monitor };
        }
        return { message: 'Failed: Patching checkout', nextState: States.Stopped };
      }

      // login needed
      if (redirectUrl.indexOf('account') > -1) {
        if (this._context.task.username && this._context.task.password) {
          return { message: 'Logging in', nextState: States.Login };
        }
        return { message: 'Account required', nextState: States.Stopped };
      }

      // password page
      if (redirectUrl.indexOf('password') > -1) {
        return { message: 'Password page', nextState: States.CreateCheckout };
      }

      // queue
      if (redirectUrl.indexOf('throttle') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Waiting for queue', nextState: States.PollQueue };
      }

      // not sure where we are, stop...
      return { message: 'Failed: Submitting information', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('API CHECKOUT: Request error creating checkout: %j', err);
      return { message: 'Failed: Creating checkout', nextState: States.Stopped };
    }
  }

  async addToCart() {
    const { site, product, monitorDelay } = this._context.task;
    const { url } = site;

    this._logger.verbose('API CHECKOUT: Adding to cart');
    try {
      const res = await this._request({
        uri: `${url}/api/checkouts/${this.checkoutToken}.json`,
        method: 'PATCH',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        simple: false,
        json: true,
        headers: getHeaders(site),
        body: patchToCart(product.variants[0]),
      });

      const { statusCode, body, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.location;
      this._logger.verbose('API CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      // check redirects
      if (redirectUrl) {
        // account
        if (redirectUrl.indexOf('account') > -1) {
          if (this._context.task.username && this._context.task.password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Stopped };
        }

        // password page
        if (redirectUrl.indexOf('password') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Password page', nextState: States.CreateCheckout };
        }

        // queue
        if (redirectUrl.indexOf('throttle') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Waiting for queue', nextState: States.PollQueue };
        }
      }

      if (body.errors && body.errors.line_items[0]) {
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

      if (body.checkout && body.checkout.line_items.length > 0) {
        this._logger.verbose('Successfully added to cart');
        const { total_price: totalPrice } = res.body.checkout;
        this.prices.item = parseFloat(totalPrice).toFixed(2);
        return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
      }
      return { message: 'Failed: Add to cart', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('API CHECKOUT: Request error adding to cart %j', err);
      return { message: 'Failed: Add to cart', nextState: States.Stopped };
    }
  }

  async shippingRates() {
    this._logger.verbose('API CHECKOUT: Fetching shipping rates');
    const { site, monitorDelay } = this._context.task;
    const { url } = site;

    // TODO - find a shared location for timeouts
    if (this._context.timer.getRunTime(now()) > 10000) {
      return { message: 'Failed: Shipping rates timeout', nextState: States.Stopped };
    }

    try {
      const res = await this._request({
        uri: `${url}/api/checkouts/${this.checkoutToken}/shipping_rates.json`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        followAllRedirects: false,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        json: true,
        simple: false,
        headers: getHeaders(site),
      });

      const { statusCode, body } = res;

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // extra check for country not supported
      if (statusCode === 422) {
        return { message: 'Country not supported', nextState: States.Stopped };
      }

      if (body && body.errors) {
        const { errors } = res;
        this._logger.verbose('API CHECKOUT: Error getting shipping rates: %j', errors);
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
        this._logger.silly('API CHECKOUT: Using shipping method: %s', title);

        // set shipping price for cart
        let { shipping } = this.prices;
        shipping = parseFloat(cheapest.price).toFixed(2);
        this._logger.silly('API CHECKOUT: Shipping total: %s', shipping);
        return {
          message: `Using rate ${this.chosenShippingMethod.name}`,
          nextState: States.PostPayment,
        };
      }
      this._logger.verbose('No shipping rates available, polling %d ms', monitorDelay);
      await waitForDelay(monitorDelay);
      return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
    } catch (err) {
      this._logger.debug('API CHECKOUT: Request error fetching shipping method: %j', err);
      return { message: 'Failed: Fetching shipping rates', nextState: States.Stopped };
    }
  }
}
module.exports = APICheckout;
