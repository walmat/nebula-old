/* eslint-disable class-methods-use-this */
const cheerio = require('cheerio');
const { waitForDelay, formatProxy, userAgent, getHeaders, checkStatusCode } = require('./utils');
const { buildPaymentForm } = require('./utils/forms');
const { Delays } = require('../classes/utils/constants').Checkout;
const { CheckoutErrorCodes } = require('./utils/constants').ErrorCodes;

class Checkout {
  constructor(context) {
    this._context = context;
    this._logger = this._context.logger;
    this._request = this._context.request;

    this.paymentTokens = [];
    this.shippingMethods = [];
    this.chosenShippingMethod = {
      name: null,
      id: null,
    };
    this.checkoutTokens = [];
    this.checkoutToken = null;

    this.storeId = null;
    this.paymentUrlKey = null;
    this.prices = {
      item: 0,
      shipping: 0,
      total: 0,
    };
    this.gateway = '';
    this.captchaToken = '';
  }

  // MARK : Methods defined in subclasses

  async addToCart() {
    throw new Error('Should be defined in subclasses');
  }

  async createCheckout() {
    throw new Error('Should be defined in subclasses');
  }

  async shippingRates() {
    throw new Error('Should be defined in subclasses');
  }

  async paymentGateway() {
    throw new Error('Should be defined in subclasses');
  }

  async postPayment() {
    throw new Error('Should be defined in subclasses');
  }

  async paymentReview() {
    throw new Error('Should be defined in subclasses');
  }

  async paymentProcessing() {
    throw new Error('Should be defined in subclasses');
  }

  // MARK : Shared super class methods

  async login() {
    const { site, username, password } = this._context.task;
    const { url } = site;
    this._logger.verbose('CHECKOUT: Starting login request to %s', url);

    try {
      const res = await this._request({
        uri: `${url}/account/login`,
        method: 'post',
        simple: false,
        rejectUnauthorized: false,
        followAllRedirects: true,
        proxy: formatProxy(this._context.proxy),
        resolveWithFullResponse: true,
        headers: {
          'User-Agent': userAgent,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: `${url}/account/login`,
        },
        formData: {
          form_data: 'customer_login',
          utf8: '✓',
          'customer[email]': username,
          'customer[password]': password,
          authenticity_token: super.authTokens.length > 0 ? super.authTokens.shift() : '',
          'g-recaptcha-response': super.captchaToken,
        },
      });

      const { statusCode, request, headers } = res;
      const { href } = request;

      if (href.indexOf('password') > -1) {
        return { status: CheckoutErrorCodes.Password };
      }

      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }

      if (href.indexOf('challenge') > -1) {
        this._logger.verbose('CHECKOUT: Login needs captcha');
        const $ = cheerio.load(res.body);
        const authToken = $('form input[name="authenticity_token"]').attr('value');
        this.authTokens.push(authToken);
        return { errors: CheckoutErrorCodes.InvalidCaptchaToken };
      }

      if (href.indexOf('login') > -1) {
        this._logger.verbose('CHECKOUT: Invalid login credentials');
        return { errors: CheckoutErrorCodes.InvalidLogin };
      }

      this._logger.verbose('CHECKOUT: Login response cookies: %j', headers['set-cookie']);
      this._logger.info('Logged in! Proceeding to add to cart');
      return { errors: null };
    } catch (err) {
      this._logger.debug('ACCOUNT: Error logging in: %s', err);
      return { errors: err };
    }
  }

  async paymentToken() {
    const { payment, billing } = this._context.task.profile;
    this._logger.verbose('CHECKOUT: Generating Payment Token');
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
      const body = JSON.parse(res.body);
      if (body && body.id) {
        this._logger.verbose('Payment token: %s', body.id);
        this.paymentTokens.push(body.id);
        return body.id;
      }
      return null;
    } catch (err) {
      this._logger.debug('CHECKOUT: Error getting payment token: %s', err);
      return null;
    }
  }

  /**
   * Handles waiting in a checkout queue for Shopify
   * @returns {} || `CheckoutObject`
   */
  async pollQueue() {
    this._logger.verbose('CHECKOUT: Waiting in queue');
    const { site } = this._context.task;
    try {
      const res = await this._request({
        uri: `${site.url}/checkout/poll`,
        method: 'GET',
        proxy: formatProxy(this._proxy),
        simple: false,
        json: false,
        followAllRedirects: false,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers: getHeaders,
      });
      const { statusCode } = res;
      if (checkStatusCode(statusCode)) {
        return { error: true, status: statusCode };
      }
      let { body } = res;

      this._logger.silly('CHECKOUT: Queue response body: %j', body);

      // out of queue
      // TODO – find a better way to check against empty object body
      if (JSON.parse(JSON.stringify(body)) !== '{}' && !body.indexOf('throttle') > -1) {
        this._logger.verbose('CHECKOUT: Queue bypassed');
        try {
          body = JSON.parse(body);
          this._logger.verbose('CHECKOUT: Queue JSON body: %j', body);
          if (body.checkout) {
            const { checkout } = body;
            const { clone_url } = checkout;
            this._logger.verbose(
              'CHECKOUT: Created checkout token after queue: %s',
              clone_url.split('/')[5],
            );
            // eslint-disable-next-line prefer-destructuring
            this.storeId = clone_url.split('/')[3];
            // eslint-disable-next-line prefer-destructuring
            this.paymentUrlKey = checkout.web_url.split('=')[1];
            // push the checkout token to the stack
            this.checkoutTokens.push(clone_url.split('/')[5]);
            return true;
          }
          // might not ever get called, but just a failsafe
          this._logger.debug('Failed: Creating checkout session after queue %s', res);
          return false;
        } catch (err) {
          if (err instanceof SyntaxError) {
            this._logger.debug('CHECKOUT: Failed to parse body, not typeof JSON');
            const $ = cheerio.load(body);
            let data = null;
            if (statusCode === 202) {
              data = $('input[name="checkout_url"]').val();
              this._logger.silly('CHECKOUT: 202 response data: %j', data);
              if (data) {
                // parse out what we need
                // eslint-disable-next-line prefer-destructuring
                this.storeId = data.split('/')[3];
                // eslint-disable-next-line prefer-destructuring
                this.checkoutTokens.push(data.split('/')[5]);
                return true;
              }
            }
            if (statusCode === 303) {
              data = $('input').attr('href');
              this._logger.silly('CHECKOUT: 303 response data: %j', data);
              if (data) {
                // eslint-disable-next-line prefer-destructuring
                this.storeId = data.split('/')[3];
                // eslint-disable-next-line prefer-destructuring
                this.checkoutTokens.push(data.split('/')[5]);
                return true;
              }
            }
            this._logger.debug(
              'CHECKOUT: Failed: Queue responded with status code: %s',
              statusCode,
            );
            return false;
          }
          this._logger.debug('CHECKOUT: Failed to parse body: %j', err);
          return false;
        }
      }
      this._logger.verbose('CHECKOUT: Not passed queue, delaying %d ms', Delays.PollCheckoutQueue);
      await waitForDelay(Delays.PollCheckoutQueue);
      return false;
    } catch (err) {
      this._logger.debug('CHECKOUT: Error polling queue: %s', err.error);
      return {
        error: err.error,
        status: null,
      };
    }
  }

  async requestCaptcha() {
    this._logger.verbose('CHECKOUT: Getting Solved Captcha...');
    const token = await this._context.getCaptcha();
    if (!token) {
      this._logger.verbose('CHECKOUT: Unable to get token!');
      return {
        errors: CheckoutErrorCodes.InvalidCaptchaToken,
      };
    }
    this._logger.verbose('CHECKOUT: Received token from captcha harvesting: %s', token);
    this.captchaToken = token;
    return { errors: null };
  }

  async run() {
    throw new Error('Should be defined in subclasses');
  }
}

module.exports = Checkout;
