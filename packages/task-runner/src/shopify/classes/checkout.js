/* eslint-disable class-methods-use-this */
const cheerio = require('cheerio');
const { formatProxy, userAgent, getHeaders, stateForStatusCode, waitForDelay } = require('./utils');
const { States } = require('./utils/constants').TaskRunner;

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
        method: 'post',
        simple: false,
        rejectUnauthorized: false,
        followAllRedirects: true,
        proxy: formatProxy(this._proxy),
        resolveWithFullResponse: true,
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

      this._logger.verbose('CHECKOUT: Login response cookies: %j', headers['set-cookie']);
      // if we know the shipping method, it's safe to assume we came from `States.PaymentGateway`
      if (this.chosenShippingMethod.id) {
        return { message: 'Fetching payment gateway', nextState: States.PaymentGateway };
      }
      return { message: 'Fetching payment token', nextState: States.PaymentToken };
    } catch (err) {
      this._logger.debug('ACCOUNT: Error logging in: %s', err);
      return { message: 'Failed: Logging in', nextState: States.Stopped };
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
}

module.exports = Checkout;
