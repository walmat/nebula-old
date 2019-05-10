const { min } = require('underscore');

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
    const {
      task: {
        site: { apiKey },
        profile: { payment, billing },
      },
      proxy,
    } = this._context;

    try {
      const { statusCode, body } = await this._request({
        uri: `https://elb.deposit.shopifycs.com/sessions`,
        followAllRedirects: true,
        proxy: formatProxy(proxy),
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

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Starting task setup', nextState: States.PaymentToken };
      }
      let id = null;
      try {
        ({ id } = JSON.parse(body));
      } catch (e) {
        return { message: 'Failed: Creating payment token', nextState: States.Errored };
      }
      if (id) {
        this._logger.silly('Payment token: %s', id);
        this.paymentToken = id;
        if (!apiKey) {
          return { message: 'Parsing Access Token', nextState: States.ParseAccessToken };
        }
        return { message: 'Creating checkout', nextState: States.CreateCheckout };
      }
      return {
        message: `(${statusCode}) Failed: Creating payment token`,
        nextState: States.Errored,
      };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %d Request Error..\n Step: Payment Token.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Creating payment token',
        nextState: States.PaymentToken,
      });
      return (
        nextState || {
          message: `(${err.statusCode}) Failed: Creating payment token`,
          nextState: States.Errored,
        }
      );
    }
  }

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
      const {
        statusCode,
        headers: { location },
      } = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        proxy: formatProxy(proxy),
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

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Submitting information', nextState: States.PatchCheckout };
      }

      const redirectUrl = location;
      this._logger.silly('API CHECKOUT: Patch checkout redirect url: %s', redirectUrl);
      if (!redirectUrl || redirectUrl.indexOf('checkouts') > -1) {
        if (statusCode === 200 || statusCode === 302) {
          return { message: 'Monitoring for product', nextState: States.Monitor };
        }
        return {
          message: `(${statusCode}) Failed: Submitting information`,
          nextState: States.Errored,
        };
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

      return {
        message: `(${statusCode}) Failed: Submitting information`,
        nextState: States.Errored,
      };
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
      return (
        nextState || {
          message: `(${err.statusCode}) Failed: Submitting information`,
          nextState: States.Errored,
        }
      );
    }
  }

  async addToCart() {
    const {
      task: {
        site: { url, apiKey },
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
      const {
        statusCode,
        body: { errors, checkout },
        headers: { location },
      } = await this._request({
        uri: `${url}/api/checkouts/${this.checkoutToken}.json`,
        method: 'PATCH',
        proxy: formatProxy(proxy),
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

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // server error
      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Adding to cart', nextState: States.AddToCart };
      }

      const redirectUrl = location;
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

      if (errors && errors.line_items) {
        const [error] = errors.line_items;
        this._logger.silly('Error adding to cart: %j', error);
        if (error && error.quantity) {
          if (monitor.getRunTime() > CheckoutRefresh) {
            return { message: 'Pinging checkout', nextState: States.PingCheckout };
          }
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.Restocking };
        }
        if (error && error.variant_id && error.variant_id[0]) {
          if (type === Types.ShippingRates) {
            return { message: 'Invalid variant', nextState: States.Errored };
          }
          if (monitor.getRunTime() > CheckoutRefresh) {
            return { message: 'Pinging checkout', nextState: States.PingCheckout };
          }
          await waitForDelay(monitorDelay);
          return { message: 'Monitoring for product', nextState: States.AddToCart };
        }
        return { message: `(${statusCode}) Failed: Add to cart`, nextState: States.Errored };
      }

      if (checkout && checkout.line_items && checkout.line_items.length) {
        const { total_price: totalPrice } = checkout;

        this._context.task.product.name = checkout.line_items[0].title;
        this._context.task.product.image = checkout.line_items[0].image_url.startsWith('http')
          ? checkout.line_items[0].image_url
          : `http:${checkout.line_items[0].image_url}`;

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
      return { message: `(${statusCode}) Failed: Add to cart`, nextState: States.Errored };
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
      return (
        nextState || {
          message: `(${err.statusCode}) Failed: Add to cart`,
          nextState: States.Errored,
        }
      );
    }
  }

  async shippingRates() {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
        errorDelay,
      },
      proxy,
    } = this._context;

    try {
      const {
        statusCode,
        body: { errors, shipping_rates: shippingRates },
      } = await this._request({
        uri: `${url}/api/checkouts/${this.checkoutToken}/shipping_rates.json`,
        method: 'GET',
        proxy: formatProxy(proxy),
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

      if (errors) {
        this._logger.silly('API CHECKOUT: Error getting shipping rates: %j', errors);
        const { checkout } = errors;
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

      if (shippingRates && shippingRates.length > 0) {
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
      return (
        nextState || {
          message: `(${err.statusCode}) Failed: Fetching shipping rates`,
          nextState: States.Errored,
        }
      );
    }
  }
}
module.exports = APICheckout;
