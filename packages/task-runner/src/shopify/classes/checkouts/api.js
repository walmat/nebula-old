const _ = require('underscore');

const {
  formatProxy,
  getHeaders,
  stateForError,
  stateForStatusCode,
  userAgent,
  waitForDelay,
} = require('../utils');
const { patchCheckoutForm } = require('../utils/forms');
const { buildPaymentForm, patchToCart } = require('../utils/forms');
const { Types, States, CheckoutRefresh } = require('../utils/constants').TaskRunner;
const Checkout = require('../checkout');

/**
 * CHECKOUT STEPS:
 * 1. LOGIN (IF NEEDED)
 * 2. PAYMENT TOKEN
 * 3. CREATE CHECKOUT (POLL QUEUE IF NEEDED AND PROCEED TO #4)
 * 4. PATCH CHECKOUT (POLL QUEUE IF NEEDED AND PROCEED TO #5)
 * 5. MONITOR
 * 6. ADD TO CART
 * 7. SHIPPING RATES
 * 8. POST CHECKOUT
 * 9. COMPLETE CHECKOUT (IF NEEDED)
 * 10. PROCESSING...
 */
class APICheckout extends Checkout {
  async getPaymentToken() {
    const { payment, billing } = this._context.task.profile;

    try {
      const res = await this._request({
        uri: `https://elb.deposit.shopifycs.com/sessions`,
        followAllRedirects: true,
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        method: 'post',
        resolveWithFullResponse: true,
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
          Connection: 'Keep-Alive',
        },
        body: JSON.stringify(buildPaymentForm(payment, billing)),
      });

      const { statusCode } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Starting task setup', nextState: States.PaymentToken };
      }

      const body = JSON.parse(res.body);
      if (body && body.id) {
        const { id } = body;
        this._logger.silly('Payment token: %s', id);
        this.paymentToken = id;
        return { message: 'Creating checkout', nextState: States.CreateCheckout };
      }
      return { message: 'Failed: Creating payment token', nextState: States.Errored };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %d Request Error..\n Step: Payment Token.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Starting task setup',
        nextState: States.PaymentToken,
      });
      return nextState || { message: 'Failed: Creating payment token', nextState: States.Errored };
    }
  }

  async patchCheckout() {
    const { site, profile, monitorDelay } = this._context.task;
    const { shipping, billing, payment } = profile;
    const { url } = site;

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
        body: JSON.stringify(
          patchCheckoutForm(profile, shipping, billing, payment, this.captchaToken),
        ),
      });
      // Reset captcha token so we don't use it again
      this.captchaToken = null;

      const { statusCode, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // server error
      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Submitting information', nextState: States.PatchCheckout };
      }

      const redirectUrl = headers.location;
      this._logger.silly('API CHECKOUT: Patch checkout redirect url: %s', redirectUrl);
      if (!redirectUrl || redirectUrl.indexOf('checkouts') > -1) {
        if (statusCode === 200 || statusCode === 302) {
          return { message: 'Monitoring for product', nextState: States.Monitor };
        }
        return { message: 'Failed: Patching checkout', nextState: States.Errored };
      }

      // login needed
      if (redirectUrl.indexOf('account') > -1) {
        if (this._context.task.username && this._context.task.password) {
          return { message: 'Logging in', nextState: States.Login };
        }
        return { message: 'Account required', nextState: States.Errored };
      }

      // password page
      if (redirectUrl.indexOf('password') > -1) {
        return { message: 'Password page', nextState: States.CreateCheckout };
      }

      // queue
      if (redirectUrl.indexOf('throttle') > -1) {
        return { message: 'Waiting in queue', nextState: States.PollQueue };
      }

      // not sure where we are, stop...
      return { message: 'Failed: Submitting information', nextState: States.Errored };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %d Request Error..\n Step: Submitting Information.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting information',
        nextState: States.PatchCheckout,
      });
      return nextState || { message: 'Failed: Submitting information', nextState: States.Errored };
    }
  }

  async addToCart() {
    const { timers, type } = this._context;
    const { site, product, monitorDelay } = this._context.task;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/api/checkouts/${this.checkoutToken}.json`,
        method: 'PATCH',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        json: true,
        gzip: true,
        headers: {
          ...getHeaders(site),
          'Accept-Encoding': 'gzip, deflate, br',
        },
        body: patchToCart(product.variants[0]),
      });

      const { statusCode, body, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // server error
      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Adding to cart', nextState: States.AddToCart };
      }

      const redirectUrl = headers.location;
      this._logger.silly('API CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      // check redirects
      if (redirectUrl) {
        // account
        if (redirectUrl.indexOf('account') > -1) {
          if (this._context.task.username && this._context.task.password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Errored };
        }

        // password page
        if (redirectUrl.indexOf('password') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Password page', nextState: States.CreateCheckout };
        }

        // queue
        if (redirectUrl.indexOf('throttle') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Waiting in queue', nextState: States.PollQueue };
        }
      }

      if (body.errors && body.errors.line_items[0]) {
        const error = res.body.errors.line_items[0];
        this._logger.silly('Error adding to cart: %j', error);
        if (error.quantity) {
          if (timers.monitor.getRunTime() > CheckoutRefresh) {
            return { message: 'Pinging checkout', nextState: States.PingCheckout };
          }
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.Restocking };
        }
        if (error.variant_id && error.variant_id[0]) {
          if (type === Types.ShippingRates) {
            return { message: 'Invalid variant', nextState: States.Errored };
          }
          if (timers.monitor.getRunTime() > CheckoutRefresh) {
            return { message: 'Pinging checkout', nextState: States.PingCheckout };
          }
          await waitForDelay(monitorDelay);
          return { message: 'Monitoring for product', nextState: States.AddToCart };
        }
        return { message: 'Failed: Add to cart', nextState: States.Errored };
      }

      if (body.checkout && body.checkout.line_items.length > 0) {
        const { total_price: totalPrice } = body.checkout;

        this._context.task.product.name = body.checkout.line_items[0].title;
        this._context.task.product.image = body.checkout.line_items[0].image_url.startsWith('http')
          ? body.checkout.line_items[0].image_url
          : `http:${body.checkout.line_items[0].image_url}`;

        // start checkout speed timer
        timers.checkout.reset();
        timers.checkout.start();

        // calc item price, then calc total price
        this.prices.item = parseFloat(totalPrice).toFixed(2);
        this.prices.total = (
          parseFloat(this.prices.item) + parseFloat(this.prices.shipping)
        ).toFixed(2);
        if (this.chosenShippingMethod.id) {
          this._logger.silly('API CHECKOUT: Shipping total: %s', this.prices.shipping);
          return { message: `Posting payment`, nextState: States.PostPayment };
        }
        return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
      }
      return { message: 'Failed: Add to cart', nextState: States.Errored };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %d Request Error..\n Step: Add to Cart.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Adding to cart',
        nextState: States.AddToCart,
      });
      return nextState || { message: 'Failed: Add to cart', nextState: States.Errored };
    }
  }

  async shippingRates() {
    const { site, monitorDelay, errorDelay } = this._context.task;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/api/checkouts/${this.checkoutToken}/shipping_rates.json`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        json: true,
        simple: false,
        gzip: true,
        headers: {
          ...getHeaders(site),
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'en-GB, en-US; en; q=0.8',
        },
      });

      const { statusCode, body } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        await waitForDelay(errorDelay);
        return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
      }

      // extra check for country not supported
      if (statusCode === 422) {
        return { message: 'Country not supported', nextState: States.Errored };
      }

      if (body && body.errors) {
        const { errors } = body;
        this._logger.silly('API CHECKOUT: Error getting shipping rates: %j', errors);
        if (errors && errors.checkout) {
          const errorMessage = JSON.stringify(errors.checkout);
          if (errorMessage.indexOf('does_not_require_shipping') > -1) {
            this._logger.silly('API CHECKOUT: Cart empty, retrying add to cart');
            return { message: 'Cart empty, retrying ATC', nextState: States.AddToCart };
          }

          if (errorMessage.indexOf("can't be blank") > -1) {
            this._logger.silly('API CHECKOUT: Country not supported');
            return { message: 'Country not supported', nextState: States.Errored };
          }
        }
        await waitForDelay(monitorDelay);
        return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
      }

      if (body && body.shipping_rates && body.shipping_rates.length > 0) {
        const { shipping_rates: shippingRates } = body;
        shippingRates.forEach(rate => {
          this.shippingMethods.push(rate);
        });

        const cheapest = _.min(this.shippingMethods, rate => rate.price);
        // Store cheapest shipping rate
        this.selectedShippingRate = cheapest;
        const { id, title } = cheapest;
        this.chosenShippingMethod = { id, name: title };
        this._logger.silly('API CHECKOUT: Using shipping method: %s', title);

        // set shipping price for cart
        this.prices.shipping = parseFloat(cheapest.price).toFixed(2);
        this._logger.silly('API CHECKOUT: Shipping total: %s', this.prices.shipping);
        return { message: `Posting payment`, nextState: States.PostPayment };
      }
      this._logger.silly('No shipping rates available, polling %d ms', monitorDelay);
      await waitForDelay(monitorDelay);
      return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %d Request Error..\n Step: Shipping Rates.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Fetching shipping rates',
        nextState: States.ShippingRates,
      });
      return nextState || { message: 'Failed: Fetching shipping rates', nextState: States.Errored };
    }
  }
}
module.exports = APICheckout;
