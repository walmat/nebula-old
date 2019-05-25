const { min } = require('underscore');

const { getHeaders, stateForError, waitForDelay } = require('../utils');
const { patchCheckoutForm } = require('../utils/forms');
const { patchToCart } = require('../utils/forms');
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
  async patchCheckout() {
    const {
      task: {
        site: { url, apiKey },
        profile: { shipping, billing, payment, billingMatchesShipping },
        username,
        password,
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        proxy,
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        json: false,
        headers: {
          ...getHeaders({ url, apiKey }),
          'Accept-Language': 'en-US,en;q=0.8',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Upgrade-Insecure-Requests': '1',
        },
        body: JSON.stringify(
          patchCheckoutForm(billingMatchesShipping, shipping, billing, payment, this.captchaToken),
        ),
      });
      this.captchaToken = '';

      const { statusCode, headers } = res;

      const checkStatus = stateForError(
        { statusCode },
        {
          message: 'Submitting information',
          nextState: States.PatchCheckout,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.location;
      this._logger.silly('API CHECKOUT: Patch checkout redirect url: %s', redirectUrl);
      if (!redirectUrl || /checkouts/.test(redirectUrl)) {
        if (statusCode === 200 || statusCode === 302) {
          this.needsPatched = false;
          return { message: 'Monitoring for product', nextState: States.Monitor };
        }

        const message = statusCode
          ? `Submitting information – (${statusCode})`
          : 'Submitting information';

        return { message, nextState: States.PatchCheckout };
      }

      if (redirectUrl.indexOf('account') > -1) {
        if (username && password) {
          return { message: 'Logging in', nextState: States.Login };
        }
        return { message: 'Account required', nextState: States.Errored };
      }

      if (redirectUrl.indexOf('password') > -1) {
        return { message: 'Password page', nextState: States.CreateCheckout };
      }

      if (redirectUrl.indexOf('throttle') > -1) {
        return { message: 'Waiting in queue', nextState: States.PollQueue };
      }

      const message = statusCode
        ? `Submitting information – (${statusCode})`
        : 'Submitting information';

      return { message, nextState: States.PatchCheckout };
    } catch (err) {
      this._logger.debug(err);
      this._logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Submitting Information.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting information',
        nextState: States.PatchCheckout,
      });

      const message = err.statusCode
        ? `Submitting information – (${err.statusCode})`
        : 'Submitting information';

      return nextState || { message, nextState: States.PatchCheckout };
    }
  }

  async addToCart() {
    const {
      task: {
        site: { url, apiKey },
        sizes,
        product: { variants },
        monitorDelay,
        username,
        password,
      },
      proxy,
      timers: { monitor, checkout: checkoutTimer },
      type,
    } = this._context;

    try {
      const res = await this._request({
        uri: `${url}/api/checkouts/${this.checkoutToken}.json`,
        method: 'PATCH',
        proxy,
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        json: true,
        gzip: true,
        headers: {
          ...getHeaders({ url, apiKey }),
          'Accept-Encoding': 'gzip, deflate, br',
        },
        body: patchToCart(variants[0]),
      });

      const { statusCode, body, headers } = res;

      const checkStatus = stateForError(
        { statusCode },
        {
          message: 'Adding to cart',
          nextState: States.AddToCart,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.location;
      this._logger.silly('API CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      // check redirects
      if (redirectUrl) {
        if (redirectUrl.indexOf('account') > -1) {
          if (username && password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Errored };
        }

        if (redirectUrl.indexOf('password') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Password page', nextState: States.CreateCheckout };
        }

        if (redirectUrl.indexOf('throttle') > -1) {
          return { message: 'Waiting in queue', nextState: States.PollQueue };
        }
      }

      if (body.errors && body.errors.line_items) {
        const error = body.errors.line_items[0];
        this._logger.silly('Error adding to cart: %j', error);
        if (error && error.quantity) {
          if (monitor.getRunTime() > CheckoutRefresh) {
            return { message: 'Pinging checkout', nextState: States.PingCheckout };
          }
          const nextState = sizes.includes('Random') ? States.Monitor : States.AddToCart;
          return { message: 'Running for restocks', nextState };
        }
        if (error && error.variant_id[0]) {
          if (type === Types.ShippingRates) {
            return { message: 'Invalid variant', nextState: States.Errored };
          }
          if (monitor.getRunTime() > CheckoutRefresh) {
            return { message: 'Pinging checkout', nextState: States.PingCheckout };
          }
          await waitForDelay(monitorDelay);
          return { message: 'Monitoring for product', nextState: States.AddToCart };
        }

        const message = statusCode ? `Adding to cart – (${statusCode})` : 'Adding to cart';
        return { message, nextState: States.AddToCart };
      }

      if (body.checkout && body.checkout.line_items) {
        const { total_price: totalPrice } = body.checkout;

        this._context.task.product.name = body.checkout.line_items[0].title;
        this._context.task.product.image = body.checkout.line_items[0].image_url.startsWith('http')
          ? body.checkout.line_items[0].image_url
          : `http:${body.checkout.line_items[0].image_url}`;

        checkoutTimer.reset();
        checkoutTimer.start();

        this.prices.item = parseFloat(totalPrice).toFixed(2);

        if (this.chosenShippingMethod.id) {
          this._logger.silly('API CHECKOUT: Shipping total: %s', this.prices.shipping);
          this.prices.total = (
            parseFloat(this.prices.item) + parseFloat(this.chosenShippingMethod.price)
          ).toFixed(2);
          return { message: `Posting payment`, nextState: States.PostPayment };
        }
        return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
      }
      const message = statusCode ? `Adding to cart – (${statusCode})` : 'Adding to cart';
      return { message, nextState: States.AddToCart };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Add to Cart.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Adding to cart',
        nextState: States.AddToCart,
      });

      const message = err.statusCode ? `Adding to cart – (${err.statusCode})` : 'Adding to cart';
      return nextState || { message, nextState: States.AddToCart };
    }
  }

  async shippingRates() {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request({
        uri: `${url}/api/checkouts/${this.checkoutToken}/shipping_rates.json`,
        method: 'GET',
        proxy,
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        json: true,
        simple: false,
        gzip: true,
        headers: {
          ...getHeaders({ url, apiKey }),
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'en-GB, en-US; en; q=0.8',
        },
      });

      const { statusCode, body } = res;

      const checkStatus = stateForError(
        { statusCode },
        {
          message: 'Fetching shipping rates',
          nextState: States.ShippingRates,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      // extra check for country not supported
      if (statusCode === 422) {
        return { message: 'Country not supported', nextState: States.Errored };
      }

      if (body && body.errors) {
        this._logger.silly('API CHECKOUT: Error getting shipping rates: %j', body.errors);
        const { checkout } = body.errors;
        if (checkout) {
          const errorMessage = JSON.stringify(checkout);
          if (errorMessage.indexOf('does_not_require_shipping') > -1) {
            this._logger.silly('API CHECKOUT: Cart empty, retrying add to cart');
            return { message: 'Retrying ATC', nextState: States.AddToCart };
          }

          if (errorMessage.indexOf("can't be blank") > -1) {
            this._logger.silly('API CHECKOUT: Country not supported');
            return { message: 'Country not supported', nextState: States.Errored };
          }
        }
        await waitForDelay(500);
        return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
      }

      if (body && body.shipping_rates && body.shipping_rates.length > 0) {
        const { shipping_rates: shippingRates } = body;
        shippingRates.forEach(rate => {
          this.shippingMethods.push(rate);
        });

        const cheapest = min(this.shippingMethods, rate => rate.price);
        // Store cheapest shipping rate
        this.selectedShippingRate = cheapest;
        const { id, title } = cheapest;
        this.chosenShippingMethod = { id, name: title };
        this._logger.silly('API CHECKOUT: Using shipping method: %s', title);

        // set shipping price for cart
        this.prices.shipping = parseFloat(cheapest.price).toFixed(2);
        this.prices.total = (
          parseFloat(this.prices.item) + parseFloat(this.prices.shipping)
        ).toFixed(2);
        this._logger.silly('API CHECKOUT: Shipping total: %s', this.prices.shipping);
        return { message: 'Posting payment', nextState: States.PostPayment };
      }
      this._logger.silly('No shipping rates available, polling %d ms', monitorDelay);
      await waitForDelay(monitorDelay);
      return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Shipping Rates.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Fetching shipping rates',
        nextState: States.ShippingRates,
      });

      const message = err.statusCode
        ? `Fetching shipping rates – (${err.statusCode})`
        : 'Fetching shipping rates';

      return nextState || { message, nextState: States.ShippingRates };
    }
  }
}
module.exports = APICheckout;
