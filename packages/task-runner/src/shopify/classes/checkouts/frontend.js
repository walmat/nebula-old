const _ = require('underscore');
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
        return { message: 'Monitoring for product', nextState: States.Monitor };
      }
      return { message: 'Failed: Creating payment token', nextState: States.Errored };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %d Request Error..\n Step: Payment Token.\n\n %j %j',
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

  async addToCart() {
    const { site, product, monitorDelay } = this._context.task;
    const { variants, hash } = product;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/cart/add`,
        method: 'POST',
        proxy: formatProxy(this._context.proxy),
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
        formData: addToCart(variants[0], site, hash),
      });

      const { statusCode, body, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Adding to cart', nextState: States.AddToCart };
      }

      const redirectUrl = headers.location;
      this._logger.silly('FRONTEND CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      if (redirectUrl) {
        // out of stock
        if (redirectUrl.indexOf('stock_problems') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.Restocking };
        }

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
          return { message: 'Password page', nextState: States.AddToCart };
        }

        // queue
        if (redirectUrl.indexOf('throttle') > -1) {
          await waitForDelay(monitorDelay);
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
        await waitForDelay(monitorDelay);
        return { message: 'Running for restocks', nextState: States.Restocking };
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
      return nextState || { message: 'Failed: Add to cart', nextState: States.Errored };
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
    const { site, monitorDelay } = this._context.task;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'GET',
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
      });

      const { statusCode, body, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Fetching checkout', nextState: States.GetCheckout };
      }

      const redirectUrl = headers.location || res.request.href;
      this._logger.silly('FRONTEND CHECKOUT: Get checkout redirect url: %s', redirectUrl);

      // check for redirects
      if (redirectUrl) {
        // account needed
        if (redirectUrl.indexOf('account') > -1) {
          if (this._context.task.username && this._context.task.password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Errored };
        }

        // out of stock
        if (redirectUrl.indexOf('stock_problems') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.Restocking };
        }

        // password page
        if (redirectUrl.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.CreateCheckout };
        }

        // queue
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
      return nextState || { message: 'Failed: Fetching checkout', nextState: States.Errored };
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

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Submitting information', nextState: States.PatchCheckout };
      }

      const redirectUrl = headers.location;
      this._logger.silly('FRONTEND CHECKOUT: Patch checkout redirect url: %s', redirectUrl);
      if (!redirectUrl) {
        if (statusCode >= 200 && statusCode < 310) {
          return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
        }
        return { message: 'Failed: Submitting information', nextState: States.Errored };
      }

      // check for redirects
      if (redirectUrl) {
        // account needed
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
          await waitForDelay(monitorDelay);
          return { message: 'Waiting in queue', nextState: States.PollQueue };
        }
      }

      // unknown redirect, stopping...
      return { message: 'Failed: Submitting information', nextState: States.Errored };
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
      return nextState || { message: 'Failed: Submitting information', nextState: States.Errored };
    }
  }

  async shippingRates() {
    const { site, profile, monitorDelay } = this._context.task;
    const { url } = site;
    const { shipping } = profile;
    const { country, province, zipCode } = shipping;

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
          'shipping_address[province]': province ? province.value : '',
        },
      });

      const { statusCode, body } = res;
      const { shipping_rates: shippingRates } = body;

      // extra check for carting
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

      if (body && body.errors) {
        this._logger.silly('FRONTEND CHECKOUT: Error getting shipping rates: %j', body.errors);
        return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
      }

      // eslint-disable-next-line camelcase
      if (body && shippingRates) {
        shippingRates.forEach(rate => {
          this.shippingMethods.push(rate);
        });

        const cheapest = _.min(this.shippingMethods, rate => rate.price);
        const { name } = cheapest;
        const id = `${cheapest.source}-${encodeURIComponent(cheapest.name)}-${cheapest.price}`;
        this.chosenShippingMethod = { id, name };
        this._logger.silly('FRONTEND CHECKOUT: Using shipping rate: %s', name);

        // set shipping price for cart
        this.prices.shipping = cheapest.price;
        this._logger.silly('FRONTEND CHECKOUT: Shipping cost: %s', this.prices.shipping);

        return {
          message: `Using rate: ${name}`,
          nextState: States.PostPayment,
        };
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
      return nextState || { message: 'Failed: Fetching shipping rates', nextState: States.Errored };
    }
  }
}
module.exports = FrontendCheckout;
