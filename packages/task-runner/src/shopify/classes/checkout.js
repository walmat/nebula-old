/* eslint-disable class-methods-use-this */
const cheerio = require('cheerio');

const {
  formatProxy,
  getHeaders,
  now,
  stateForStatusCode,
  userAgent,
  waitForDelay,
} = require('./utils');
const { States } = require('./utils/constants').TaskRunner;

class Checkout {
  constructor(context) {
    this._context = context;
    this._logger = this._context.logger;
    this._request = this._context.request;

    this.shippingMethods = [];
    this.chosenShippingMethod = {
      name: null,
      id: null,
    };
    this.paymentToken = null;
    this.checkoutToken = null;

    this.storeId = null;
    this.prices = {
      item: 0,
      shipping: 0,
      total: 0,
    };

    this.captchaToken = '';
  }

  // MARK : Methods defined in subclasses

  async paymentToken() {
    throw new Error('Should be defined in subclasses');
  }

  async addToCart() {
    throw new Error('Should be defined in subclasses');
  }

  async shippingRates() {
    throw new Error('Should be defined in subclasses');
  }

  // MARK : Shared super class methods

  async login() {
    const { site, username, password, monitorDelay } = this._context.task;
    const { url } = site;

    let form;
    let heads = {
      'User-Agent': userAgent,
      Connection: 'keep-alive',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (this.captchaToken) {
      form = {
        utf8: '✓',
        authenticity_token: '',
        'g-recaptcha-response': this.captchaToken,
      };
      heads = {
        ...heads,
        Referer: `${url}/challenge`,
      };
    } else {
      form = {
        form_data: 'customer_login',
        utf8: '✓',
        'customer[email]': username,
        'customer[password]': password,
        Referer: `${url}/account/login`,
      };
    }

    this._logger.verbose('CHECKOUT: Logging in');
    try {
      const res = await this._request({
        uri: `${url}/account/login`,
        method: 'POST',
        proxy: formatProxy(this._proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        headers: heads,
        formData: form,
      });

      const { statusCode, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.location;
      this._logger.verbose('CHECKOUT: Login redirect url: %s', redirectUrl);

      if (redirectUrl) {
        // password page
        if (redirectUrl.indexOf('password') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Password page', nextState: States.Login };
        }

        // challenge page
        if (redirectUrl.indexOf('challenge') > -1) {
          this._logger.verbose('CHECKOUT: Login needs captcha');
          return { message: 'Captcha needed for login', nextState: States.RequestCaptcha };
        }

        // still at login page
        if (redirectUrl.indexOf('login') > -1) {
          this._logger.verbose('CHECKOUT: Invalid login credentials');
          return { message: 'Invalid login credentials', nextState: States.Stopped };
        }

        // since we're here, we can assume `account/login` === false
        if (redirectUrl.indexOf('account') > -1) {
          this._logger.verbose('CHECKOUT: Logged in');
          // check to see if we already have the storeId and checkoutToken.
          if (this.storeId && this.checkoutToken) {
            return { message: 'Submitting information', nextState: States.PatchCheckout };
          }
          return { message: 'Fetching payment token', nextState: States.PaymentToken };
        }
      }

      return { message: 'Failed: Logging in', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('ACCOUNT: Error logging in: %s', err);
      return { message: 'Failed: Logging in', nextState: States.Stopped };
    }
  }

  async createCheckout() {
    const { site, monitorDelay, errorDelay } = this._context.task;
    const { url } = site;

    this._logger.verbose('CHECKOUT: Creating checkout');
    try {
      const res = await this._request({
        uri: `${url}/checkout`,
        method: 'POST',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        json: false,
        headers: getHeaders(site),
        body: JSON.stringify({}),
      });

      const { statusCode, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // check server error
      if (statusCode === 500 || statusCode === 503) {
        await waitForDelay(errorDelay);
        return { message: 'Creating checkout', nextState: States.CreateCheckout };
      }

      const [redirectUrl] = headers.location.split('?');
      this._logger.verbose('CHECKOUT: Create checkout redirect url: %s', redirectUrl);
      if (!redirectUrl) {
        return { message: 'Failed: Creating checkout', nextState: States.Stopped };
      }

      // example: https://www.hanon-shop.com/account/login?checkout_url=https%3A%2F%2Fwww.hanon-shop.com%2F20316995%2Fcheckouts%2Fb92b2aa215abfde741a8cf0e99eeee01
      // account
      if (redirectUrl.indexOf('account') > -1) {
        // try to parse out the query string
        const [, qs] = redirectUrl.split('?');
        if (qs.indexOf('checkout_url') > -1) {
          const [, checkoutUrl] = qs.split('=');
          const decodedCheckoutUrl = decodeURIComponent(checkoutUrl);
          [, , , this.storeId] = decodedCheckoutUrl.split('/');
          [, , , , , this.checkoutToken] = decodedCheckoutUrl.split('/');
        }

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

      // successful checkout created, parse it
      if (redirectUrl.indexOf('checkouts') > -1) {
        [, , , this.storeId] = redirectUrl.split('/');
        [, , , , , this.checkoutToken] = redirectUrl.split('/');
        return { message: 'Submitting information', nextState: States.PatchCheckout };
      }

      // not sure where we are, stop...
      return { message: 'Failed: Creating checkout', nextState: States.Stopped };
    } catch (error) {
      this._logger.debug('CHECKOUT: Error creating checkout: %j %d', error, error.statusCode);
      return { message: 'Failed: Creating checkout', nextState: States.Stopped };
    }
  }

  /**
   * Handles polling a checkout queue for Shopify
   *
   * // TODO - mapping to next state
   *
   * Can happen after:
   * 1. Creating checkout -> proceed to patching checkout
   * 2. Patching checkout -> [api] proceed to monitor / [fe] proceed to shipping rates
   * 3. Add to cart -> [api] proceed to shipping rates / [fe] (?) proceed to create checkout
   * @returns {} || `CheckoutObject`
   */
  async pollQueue() {
    const { site, monitorDelay } = this._context.task;
    const { url } = site;

    this._logger.verbose('CHECKOUT: Polling queue');
    try {
      const res = await this._request({
        uri: `${url}/checkout/poll`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followRedirect: false,
        resolveWithFullResponse: true,
        simple: false,
        json: false,
        headers: {
          ...getHeaders(site),
          'Upgrade-Insecure-Requests': 1,
          'x-barba': 'yes',
        },
      });

      const { statusCode, body, headers } = res;
      this._logger.silly('Checkout: poll response %d', statusCode);
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      this._logger.silly('CHECKOUT: %d: Queue response body: %j', statusCode, body);

      // Check for not empty object – `{}`
      if (Object.keys(JSON.parse(body)).length !== 0) {
        let redirectUrl;

        // check redirect header `location` parameter
        if (statusCode === 302) {
          [redirectUrl] = headers.location.split('?');
          if (redirectUrl) {
            [, , , this.storeId] = redirectUrl.split('/');
            [, , , , , this.checkoutToken] = redirectUrl.split('/');
            // next state handled by poll queue map
            return true;
          }
        }
        if (statusCode === 200 || statusCode === 202) {
          const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
          [redirectUrl] = $('input[name="checkout_url"]')
            .val()
            .split('?');
          if (redirectUrl) {
            [, , , this.storeId] = redirectUrl.split('/');
            [, , , , , this.checkoutToken] = redirectUrl.split('/');
            // next state handled by poll queue map
            return true;
          }
        }
        return { message: 'Failed: Polling queue', nextState: States.Stopped };
      }
      this._logger.verbose('CHECKOUT: Not passed queue, delaying %d ms', monitorDelay);
      await waitForDelay(monitorDelay);
      return { message: 'Waiting in queue', nextState: States.PollQueue };
    } catch (err) {
      this._logger.debug('CHECKOUT: Error polling queue: %s', err.message, err.stack);
      return { message: 'Failed: Polling queue', nextState: States.Stopped };
    }
  }

  async postPayment() {
    const { site, monitorDelay, errorDelay } = this._context.task;
    const { url, apiKey } = site;
    const { id } = this.chosenShippingMethod;

    this._logger.verbose('CHECKOUT: Posting payment');
    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        gzip: true,
        headers: {
          ...getHeaders(site),
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify({
          complete: '1',
          s: this.paymentToken,
          checkout: {
            shipping_rate: {
              id,
            },
          },
        }),
      });

      const { statusCode, body, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        await waitForDelay(errorDelay);
        return { message: 'Posting payment', nextState: States.PostPayment };
      }

      const redirectUrl = headers.location;
      this._logger.verbose('CHECKOUT: Post payment redirect url: %s', redirectUrl);

      // check if redirected
      if (redirectUrl) {
        // processing
        if (redirectUrl.indexOf('processing') > -1) {
          this._context.timer.reset();
          this._context.timer.start();
          return { message: 'Payment processing', nextState: States.PaymentProcess };
        }

        // out of stock
        if (redirectUrl.indexOf('stock_problems') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.PostPayment };
        }
      }

      // check if captcha is present
      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      const error = $('.g-recaptcha');
      this._logger.silly('CHECKOUT: Recaptcha frame present: %d %j', error.length > 0);
      if (error) {
        return { message: 'Waiting for captcha', nextState: States.RequestCaptcha };
      }

      return { message: 'Payment processing', nextState: States.CompletePayment };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error during post payment: %j', err);
      return { message: 'Failed: Posting payment', nextState: States.Stopped };
    }
  }

  async completePayment() {
    const { site, monitorDelay } = this._context.task;
    const { url, apiKey } = site;

    this._logger.verbose('CHECKOUT: Completing payment');
    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        gzip: true,
        headers: {
          ...getHeaders(site),
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify({
          complete: '1',
          'g-recaptcha-response': this.captchaToken,
        }),
      });

      const { statusCode, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.location;
      this._logger.verbose('CHECKOUT: Complete payment redirect url: %s', redirectUrl);

      if (redirectUrl) {
        // processing
        if (redirectUrl.indexOf('processing') > -1) {
          this._context.timer.reset();
          this._context.timer.start();
          return { message: 'Payment processing', nextState: States.PaymentProcess };
        }

        // out of stock
        if (redirectUrl.indexOf('stock_problems') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.PostPayment };
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
      }

      this._context.timer.reset();
      this._context.timer.start();
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
    // TODO - find a shared location for timeouts
    if (timer.getRunTime(now()) > 10000) {
      return { message: 'Processing timed out, check email', nextState: States.Stopped };
    }

    this._logger.verbose('CHECKOUT: Processing payment');
    try {
      const res = await this._request({
        uri: `${url}/wallets/checkouts/${this.checkoutToken}/payments`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        simple: false,
        json: true,
        gzip: true,
        headers: {
          ...getHeaders(site),
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'en-GB,en-US;en;q=0.8',
          Connection: 'keep-alive',
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
      });

      const { statusCode, body } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }
      this._logger.verbose('CHECKOUT: Payments object: %j', body);
      const { payments } = body;

      if (body && payments.length > 0) {
        const bodyString = JSON.stringify(body);

        // success
        if (bodyString.indexOf('thank_you') > -1) {
          return { message: 'Payment successful', nextState: States.Stopped };
        }

        // out of stock message
        if (bodyString.indexOf('Some items are no longer available') > -1) {
          return { message: 'Payment Failed – OOS', nextState: States.Stopped };
        }

        // check error messages
        const { payment_processing_error_message: paymentProcessingErrorMessage } = payments[0];
        this._logger.verbose('CHECKOUT: Payment error: %j', paymentProcessingErrorMessage);
        if (paymentProcessingErrorMessage) {
          return { message: 'Payment failed', nextState: States.Stopped };
        }
        if (payments[0].transaction && payments[0].transaction.status !== 'success') {
          const { transaction } = payments[0];
          this._logger.verbose('CHECKOUT: Payment error: %j', transaction);
          return { message: 'Payment failed', nextState: States.Stopped };
        }
        return { message: 'Payment failed', nextState: States.Stopped };
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

module.exports = Checkout;
