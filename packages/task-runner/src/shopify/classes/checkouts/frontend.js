const _ = require('underscore');

const {
  formatProxy,
  getHeaders,
  stateForStatusCode,
  userAgent,
  waitForDelay,
} = require('../utils');
const { addToCart, buildPaymentForm, createCheckoutForm } = require('../utils/forms');
const { States } = require('../utils/constants').TaskRunner;
const Checkout = require('../checkout');

/**
 * CHECKOUT STEPS:
 * 1. PAYMENT TOKEN
 * 2. MONITOR
 * 3. ADD TO CART (POLL QUEUE IF NEEDED)
 * 4. CREATE CHECKOUT (POLL QUEUE IF NEEDED)
 * 5. PATCH CHECKOUT (POLL QUEUE IF NEEDED)
 * 5. SHIPPING RATES
 * 6. POST CHECKOUT
 */
class FrontendCheckout extends Checkout {
  async getPaymentToken() {
    const { payment, billing } = this._context.task.profile;

    this._logger.verbose('FRONTEND CHECKOUT: Creating payment token');
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
        return { message: 'Monitoring for product', nextState: States.Monitor };
      }
      return { message: 'Failed: Creating payment token', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('FRONTEND CHECKOUT: Request error getting payment token: %s', err);
      return { message: 'Failed: Creating payment token', nextState: States.Stopped };
    }
  }

  async addToCart() {
    const { site, product, monitorDelay } = this._context.task;
    const { variants } = product;
    const { url } = site;

    this._logger.verbose('FRONTEND CHECKOUT: Adding to cart');
    try {
      const res = await this._request({
        uri: `${url}/cart/add`,
        method: 'POST',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: true,
        resolveWithFullResponse: true,
        simple: false,
        json: false,
        headers: {
          'User-Agent': userAgent,
          'Upgrade-Insecure-Requests': '1',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        formData: addToCart(variants[0], site),
      });

      const { statusCode, body, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.location;
      this._logger.verbose('FRONTEND CHECKOUT: Create checkout redirect url: %s', redirectUrl);

      if (redirectUrl) {
        // out of stock
        if (redirectUrl.indexOf('stock_problems') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.AddToCart };
        }

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
          return { message: 'Password page', nextState: States.AddToCart };
        }

        // queue
        if (redirectUrl.indexOf('throttle') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Waiting for queue', nextState: States.PollQueue };
        }
      }

      if (body && body.status === 404) {
        await waitForDelay(monitorDelay);
        return { message: 'Running for restocks', nextState: States.AddToCart };
      }

      return { message: 'Creating checkout', nextState: States.CreateCheckout };
    } catch (err) {
      this._logger.debug('CART: Request error in add to cart: %s', err);
      return { message: 'Failed: Add to cart', nextState: States.Stopped };
    }
  }

  async patchCheckout() {
    const { site, profile, monitorDelay } = this._context.task;
    const { shipping, billing, payment } = profile;
    const { url } = site;

    this._logger.verbose('FRONTEND CHECKOUT: Patching checkout');
    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: true,
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
      this._logger.verbose('FRONTEND CHECKOUT: Patch checkout redirect url: %s', redirectUrl);
      if (!redirectUrl) {
        return { message: 'Failed: Creating checkout', nextState: States.Stopped };
      }

      // check for redirects
      if (redirectUrl) {
        // account needed
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

        // unknown redirect, stopping...
        return { message: 'Failed: Submitting information', nextState: States.Stopped };
      }

      if (statusCode >= 200 && statusCode < 310) {
        return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
      }
      return { message: 'Failed: Submitting information', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('FRONTEND CHECKOUT: Request error creating checkout: %j', err);
      return { message: 'Failed: Creating checkout', nextState: States.Stopped };
    }
  }

  async shippingRates() {
    const { site, profile, monitorDelay } = this._context.task;
    const { url } = site;
    const { shipping } = profile;
    const { country, province, zipCode } = shipping;

    this._logger.verbose('FRONTEND CHECKOUT: Fetching shipping rates');
    try {
      const res = await this._request({
        uri: `${url}/cart/shipping_rates.json`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        simple: false,
        json: true,
        headers: {
          Origin: url,
          'User-Agent': userAgent,
        },
        qs: {
          'shipping_address[zip]': zipCode,
          'shipping_address[country]': country.value,
          'shipping_address[province]': province.value,
        },
      });

      const { statusCode, body } = res;
      const { shipping_rates: shippingRates } = body;

      // extra check for carting
      if (statusCode === 422) {
        return { message: 'Country not supported', nextState: States.Stopped };
      }

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (body && body.errors) {
        this._logger.verbose('FRONTEND CHECKOUT: Error getting shipping rates: %j', body.errors);
        return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
      }

      // eslint-disable-next-line camelcase
      if (body && shippingRates) {
        shippingRates.forEach(rate => {
          this.shippingMethods.push(rate);
        });

        const cheapest = _.min(this.shippingMethods, rate => rate.price);
        const { name } = cheapest;
        const id = `${cheapest.source}-${cheapest.name.replace('%20', ' ')}-${cheapest.price}`;
        this.chosenShippingMethod = { id, name };
        this._logger.verbose('FRONTEND CHECKOUT: Using shipping rate: %s', name);

        // set shipping price for cart
        this.prices.shipping = cheapest.price;
        this._logger.silly('FRONTEND CHECKOUT: Shipping cost: %s', this.prices.shipping);

        return {
          message: `Using rate: ${name}`,
          nextState: States.PostPayment,
        };
      }
      this._logger.verbose('No shipping rates available, polling %d ms', monitorDelay);
      return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
    } catch (err) {
      this._logger.debug('FRONTEND CHECKOUT: Request error fetching shipping rates: %j', err);
      return { message: 'Failed: Fetching shipping rates', nextState: States.Stopped };
    }
  }
}
module.exports = FrontendCheckout;