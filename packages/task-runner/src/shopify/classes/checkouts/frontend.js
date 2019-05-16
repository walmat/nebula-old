const { min } = require('underscore');
const cheerio = require('cheerio');

const { getHeaders, stateForError, userAgent, waitForDelay } = require('../utils');
const { addToCart, patchCheckoutForm } = require('../utils/forms');
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
      const res = await this._request({
        uri: `${url}/cart/add`,
        method: 'POST',
        proxy,
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

      if (this.chosenShippingMethod.id && !this.needsPatched) {
        return { message: 'Posting payment', nextState: States.PostPayment };
      }
      return { message: 'Creating checkout', nextState: States.CreateCheckout };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Add to Cart.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Adding to cart',
        nextState: States.AddToCart,
      });

      const message = err.statusCode ? `Adding to cart - (${err.statusCode})` : 'Adding to cart';

      return nextState || { message, nextState: States.Errored };
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
        sizes,
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'GET',
        proxy,
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

      const { statusCode, body, headers } = res;

      const checkStatus = stateForError(
        { statusCode },
        {
          message: 'Fetching checkout',
          nextState: States.GetCheckout,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.location;
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
          const nextState = sizes.includes('Random') ? States.Monitor : States.GetCheckout;
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState };
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
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Fetch Checkout.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Fetching checkout',
        nextState: States.GetCheckout,
      });

      const message = err.statusCode
        ? `Fetching checkout - (${err.statusCode})`
        : 'Fetching checkout';

      return nextState || { message, nextState: States.Errored };
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
      // Reset captcha token so we don't use it again
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
      this._logger.silly('FRONTEND CHECKOUT: Patch checkout redirect url: %s', redirectUrl);
      if (!redirectUrl) {
        if (statusCode >= 200 && statusCode < 310) {
          this.needsPatched = false;
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

        if (redirectUrl.indexOf('stock_problems') > -1) {
          // we can maybe find shipping rates meanwhile (if not found already) here
          return { message: 'Running for restocks', nextState: States.GetCheckout };
        }

        if (redirectUrl.indexOf('throttle') > -1) {
          return { message: 'Waiting in queue', nextState: States.PollQueue };
        }
      }

      const message = statusCode
        ? `Submitting information - (${statusCode})`
        : 'Submitting information';

      return { message, nextState: States.PatchCheckout };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submiting Information.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting information',
        nextState: States.PatchCheckout,
      });

      const message = err.statusCode
        ? `Submitting information - (${err.statusCode})`
        : 'Submitting information';

      return nextState || { message, nextState: States.Errored };
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
      const res = await this._request({
        uri: `${url}/cart/shipping_rates.json`,
        method: 'GET',
        proxy,
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

      const { statusCode, body } = res;

      if (statusCode === 422) {
        return { message: 'Country not supported', nextState: States.Errored };
      }

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

      if (body && body.errors) {
        this._logger.silly('FRONTEND CHECKOUT: Error getting shipping rates: %j', body.errors);
        await waitForDelay(1500);
        return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
      }

      // eslint-disable-next-line camelcase
      if (body && body.shipping_rates) {
        const { shipping_rates: shippingRates } = body;
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
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Shipping Rates.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Fetching shipping rates',
        nextState: States.ShippingRates,
      });

      const message = err.statusCode
        ? `Fetching shipping rates - (${err.statusCode})`
        : 'Fetching shipping rates';

      return nextState || { message, nextState: States.ShippingRates };
    }
  }
}
module.exports = FrontendCheckout;
