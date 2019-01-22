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
const { CheckoutTimeouts } = require('./utils/constants').Checkout;

class Checkout {
  constructor(context) {
    this._context = context;
    this._logger = this._context.logger;
    this._request = this._context.request;

    this.authTokens = [];
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
    this._logger.verbose('CHECKOUT: Starting login request to %s', url);

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

    try {
      const res = await this._request({
        uri: `${url}/account/login`,
        method: 'POST',
        proxy: formatProxy(this._proxy),
        rejectUnauthorized: false,
        followAllRedirects: true,
        resolveWithFullResponse: true,
        simple: false,
        headers: heads,
        formData: form,
      });
      const { statusCode, request, headers } = res;
      const { href } = request;

      if (href.indexOf('password') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Password page', nextState: States.Login };
      }

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (href.indexOf('challenge') > -1) {
        this._logger.verbose('CHECKOUT: Login needs captcha');
        return { message: 'Captcha needed for login', nextState: States.RequestCaptcha };
      }

      if (href.indexOf('login') > -1) {
        this._logger.verbose('CHECKOUT: Invalid login credentials');
        return { message: 'Invalid login credentials, stopping...', nextState: States.Stopped };
      }

      this._logger.verbose('CHECKOUT: Login response headers: %j', headers);
      return { message: 'Fetching payment token', nextState: States.PaymentToken };
    } catch (err) {
      this._logger.debug('ACCOUNT: Error logging in: %s', err);
      return { message: 'Failed: Logging in', nextState: States.Stopped };
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
        body: `{}`,
      });

      const { statusCode, body } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }
      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      const redirectUrl = $('a').attr('href');

      if (redirectUrl.indexOf('password') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Password page', nextState: States.CreateCheckout };
      }

      if (redirectUrl.indexOf('throttle') > -1 || body.indexOf('{}') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Waiting for queue', nextState: States.PollQueue };
      }

      // parse out checkoutToken and storeId
      [, , , this.storeId] = redirectUrl.split('/');
      [, , , , , this.checkoutToken] = redirectUrl.split('/');

      return { message: 'Submiting Information', nextState: States.PatchCheckout };
    } catch (error) {
      this._logger.debug('CHECKOUT: Error creating checkout: %j %d', error, error.statusCode);
      return { message: 'Failed: Creating checkout', nextState: States.Stopped };
    }
  }

  /**
   * Handles polling a checkout queue for Shopify
   *
   * Can happen after:
   * 1. Creating checkout -> proceed to patching checkout
   * 2. Patching checkout -> [api] proceed to monitor / [fe] proceed to shipping rates
   * 3. Add to cart -> [api] proceed to shipping rates / [fe] (?) proceed to create checkout
   * @returns {} || `CheckoutObject`
   */
  async pollQueue() {
    this._logger.verbose('CHECKOUT: Waiting in queue');
    const { site, monitorDelay } = this._context.task;
    const { url } = site;
    try {
      const res = await this._request({
        uri: `${url}/checkout/poll`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        simple: false,
        json: false,
        followRedirect: false,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers: {
          ...getHeaders(site),
          'Upgrade-Insecure-Requests': 1,
          'x-barba': 'yes',
        },
      });

      const { statusCode, body } = res;
      this._logger.silly('Checkout: poll response %d', statusCode);
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      this._logger.silly('CHECKOUT: Queue response body: %j', body);

      // Check for not empty object – `{}`
      if (Object.keys(JSON.parse(body)).length !== 0) {
        const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
        if (statusCode === 200 || statusCode === 302) {
          let redirectUrl = $('input[name="checkout_url"]').val();
          if (!redirectUrl) {
            redirectUrl = $('a').attr('href');
          }
          if (redirectUrl) {
            [, , , this.storeId] = redirectUrl.split('/');
            [, , , , , this.checkoutToken] = redirectUrl.split('/');
            return { message: 'Submitting Information', nextState: States.PatchCheckout };
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
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: true,
        resolveWithFullResponse: true,
        simple: false,
        headers,
        body: `{"complete":"1","s":"${
          this.paymentToken
        }","checkout":{"shipping_rate":{"id":"${id}"}}}`,
      });

      const { statusCode, request } = res;
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

module.exports = Checkout;
