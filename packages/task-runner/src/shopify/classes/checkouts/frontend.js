const { min } = require('underscore');
const cheerio = require('cheerio');

const {
  formatProxy,
  getHeaders,
  stateForError,
  stateForStatusCode,
  userAgent,
  waitForDelay,
} = require('../utils');
const { addToCart, buildPaymentForm, patchCheckoutForm } = require('../utils/forms');
const { States } = require('../utils/constants').TaskRunner;
const Checkout = require('../checkout');

/**
 * CHECKOUT STEPS:
 * 1. PAYMENT TOKEN
 * 2. MONITOR
 * 3. ADD TO CART (POLL QUEUE – PROCEEDS TO #5)
 * 4. CREATE CHECKOUT (POLL QUEUE – PROCEEDS TO #5)
 * 5. PATCH CHECKOUT (POLL QUEUE – PROCEEDS TO #6)
 * 6. SHIPPING RATES
 * 7. POST CHECKOUT
 */
class FrontendCheckout extends Checkout {
  constructor(context) {
    super(context);
    this._hasPatched = false;
  }

  async getPaymentToken() {
    const {
      task: {
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
        return { message: 'Monitoring for product', nextState: States.Monitor };
      }
      return {
        message: `(${statusCode}) Failed: Creating payment token`,
        nextState: States.Errored,
      };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %d Request Error..\n Step: Payment Token.\n\n %j %j',
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

  async addToCart() {
    const {
      task: {
        site: { url, name },
        product: { variants, hash },
        monitorDelay,
        username,
        password,
      },
      proxy,
    } = this._context;

    try {
      const {
        statusCode,
        body,
        headers: { location },
      } = await this._request({
        uri: `${url}/cart/add`,
        method: 'POST',
        proxy: formatProxy(proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        json: false,
        gzip: true,
        headers: {
          'User-Agent': userAgent,
          'Upgrade-Insecure-Requests': '1',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        formData: addToCart(variants[0], name, hash),
      });

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Adding to cart', nextState: States.AddToCart };
      }

      const redirectUrl = location;
      this._logger.silly('FRONTEND CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      if (redirectUrl) {
        if (redirectUrl.indexOf('stock_problems') > -1) {
          return { message: 'Running for restocks', nextState: States.AddToCart };
        }

        if (redirectUrl.indexOf('account') > -1) {
          if (username && password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Errored };
        }

        if (redirectUrl.indexOf('password') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Password page', nextState: States.AddToCart };
        }

        if (redirectUrl.indexOf('throttle') > -1) {
          return { message: 'Waiting in queue', nextState: States.PollQueue };
        }
      }

      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      const cartError = $('.content--desc').text();
      if (cartError && cartError.indexOf('Cannot find variant') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Monitoring for product', nextState: States.AddToCart };
      }

      if (body && body.status === 404) {
        return { message: 'Running for restocks', nextState: States.Monitor };
      }

      if (this.chosenShippingMethod.id && this._hasPatched) {
        return { message: 'Posting payment', nextState: States.PostPayment };
      }
      return { message: 'Creating checkout', nextState: States.CreateCheckout };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %d Request Error..\n Step: Add to Cart.\n\n %j %j',
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

  async createCheckout(...params) {
    // call super implementation:
    const { message, nextState } = await super.createCheckout(...params);
    // Send it to
    return {
      message,
      nextState: nextState === States.PatchCheckout ? States.GetCheckout : nextState,
    };
  }

  async getCheckout() {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
        username,
        password,
        size,
      },
      proxy,
    } = this._context;

    try {
      const {
        statusCode,
        body,
        headers: { location },
      } = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'GET',
        proxy: formatProxy(proxy),
        rejectUnauthorized: false,
        followAllRedirects: true,
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
      });

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Fetching checkout', nextState: States.GetCheckout };
      }

      const redirectUrl = location;
      this._logger.silly('FRONTEND CHECKOUT: Get checkout redirect url: %s', redirectUrl);

      // check for redirects
      if (redirectUrl) {
        if (redirectUrl.indexOf('account') > -1) {
          if (username && password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Errored };
        }

        if (redirectUrl.indexOf('stock_problems') > -1) {
          if (size.includes('Random')) {
            return { message: 'Running for restocks', nextState: States.Monitor };
          }
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.GetCheckout };
        }

        if (redirectUrl.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.CreateCheckout };
        }

        if (redirectUrl.indexOf('throttle') > -1) {
          return { message: 'Waiting in queue', nextState: States.PollQueue };
        }
      }

      // check if captcha is present
      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      const recaptcha = $('.g-recaptcha');
      this._logger.silly('CHECKOUT: Recaptcha frame present: %s', recaptcha.length > 0);
      if (recaptcha.length > 0) {
        this.needsCaptcha = true;
      }

      return { message: 'Submitting information', nextState: States.PatchCheckout };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %d Request Error..\n Step: Fetch Checkout.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Fetching checkout',
        nextState: States.GetCheckout,
      });
      return (
        nextState || {
          message: `(${err.statusCode}) Failed: Fetching checkout`,
          nextState: States.Errored,
        }
      );
    }
  }

  async patchCheckout() {
    const {
      task: {
        site: { url, apiKey },
        profile: { billingMatchesShipping, shipping, billing, payment },
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
      // Reset captcha token so we don't use it again
      this.captchaToken = '';

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Submitting information', nextState: States.PatchCheckout };
      }

      const redirectUrl = location;
      this._logger.silly('FRONTEND CHECKOUT: Patch checkout redirect url: %s', redirectUrl);
      if (!redirectUrl) {
        if (statusCode >= 200 && statusCode < 310) {
          this._hasPatched = true;
          if (this.chosenShippingMethod.id) {
            return { message: 'Posting payment', nextState: States.PostPayment };
          }
          return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
        }
        return { message: 'Failed: Submitting information', nextState: States.Errored };
      }

      // check for redirects
      if (redirectUrl) {
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
      }

      return {
        message: `(${statusCode}) Failed: Submitting information`,
        nextState: States.Errored,
      };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %d Request Error..\n Step: Submiting Information.\n\n %j %j',
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

  async shippingRates() {
    const {
      task: {
        site: { url },
        profile: {
          shipping: { country, province, zipCode },
        },
        monitorDelay,
      },
      proxy,
    } = this._context;

    try {
      const {
        statusCode,
        body: { errors, shipping_rates: shippingRates },
      } = await this._request({
        uri: `${url}/cart/shipping_rates.json`,
        method: 'GET',
        proxy: formatProxy(proxy),
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
          'shipping_address[province]': province ? province.value : '',
        },
      });

      if (statusCode === 422) {
        return { message: 'Country not supported', nextState: States.Errored };
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
      }

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (errors) {
        this._logger.silly('FRONTEND CHECKOUT: Error getting shipping rates: %j', errors);
        await waitForDelay(2000);
        return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
      }

      // eslint-disable-next-line camelcase
      if (shippingRates) {
        shippingRates.forEach(rate => {
          this.shippingMethods.push(rate);
        });

        const cheapest = min(this.shippingMethods, rate => rate.price);
        const { name, price } = cheapest;
        const id = `${cheapest.source}-${encodeURIComponent(cheapest.name)}-${cheapest.price}`;
        this.chosenShippingMethod = { id, name };
        this._logger.silly('FRONTEND CHECKOUT: Using shipping rate: %s', name);

        this.prices.shipping = price;
        this._logger.silly('FRONTEND CHECKOUT: Shipping cost: %s', this.prices.shipping);

        return { message: 'Posting payment', nextState: States.PostPayment };
      }
      this._logger.silly('No shipping rates available, polling %d ms', monitorDelay);
      await waitForDelay(monitorDelay);
      return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %d Request Error..\n Step: Shipping Rates.\n\n %j %j',
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
module.exports = FrontendCheckout;
