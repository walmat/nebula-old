/* eslint-disable class-methods-use-this */
const cheerio = require('cheerio');
const _ = require('underscore');
const { waitForDelay, formatProxy, userAgent, now } = require('./utils');
const {
  buildPaymentForm,
  createCheckoutForm,
  patchToCart,
  paymentMethodForm,
  paymentReviewForm,
} = require('./utils/forms');
const {
  CheckoutTimeouts,
  Delays,
  ShopifyPaymentSteps,
} = require('../classes/utils/constants').Checkout;
const { States } = require('./utils/constants').TaskRunner;
const { CheckoutErrorCodes } = require('./utils/constants').ErrorCodes;
const {
  getCheckoutMethod,
  CheckoutMethods,
  APICheckout,
  FrontendCheckout,
} = require('./checkouts');

class Checkout {
  constructor(context) {
    this._context = context;
    this._request = this._context.request;
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
    this.basicAuth = Buffer.from(`${this._context.task.site.apiKey}::`).toString('base64');
    this.prices = {
      item: 0,
      shipping: 0,
      total: 0,
    };
    this.gateway = '';
    this.captchaToken = '';
  }

  /**
   * Called 5 times at the start of the task
   * Generates a payment token using the task data provided from the task runner
   * @returns {String} payment token
   */
  async handleGeneratePaymentToken() {
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
   * Request to login to an account on Shopify sites
   */
  async handleLogin() {
    const { site, username, password } = this._context.task;
    const { url } = site;
    this._logger.verbose('CHECKOUT: Starting login request to %s', url);

    this._request({
      uri: `${url}/account/login`,
      method: 'post',
      simple: true,
      followAllRedirects: true,
      proxy: formatProxy(this._context.proxy),
      resolveWithFullResponse: true,
      headers: {
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: `${url}`,
      },
      formData: {
        form_data: 'customer_login',
        utf8: '✓',
        'customer[email]': username,
        'customer[password]': password,
      },
    })
      .then(res => {
        this._logger.verbose('ACCOUNT: Login response cookies: %j', res.headers['set-cookie']);
        if (res.request.href.indexOf('login') > -1) {
          return false;
        }
        this._logger.info('Logged in! Proceeding to add to cart');
        return true;
      })
      .catch(err => {
        this._logger.debug('ACCOUNT: Error logging in: %s', err);
        return {
          errors: err,
        };
      });
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
        return { status: statusCode };
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
            return { errors: null };
          }
          // might not ever get called, but just a failsafe
          this._logger.verbose('Failed: Creating checkout session after queue %s', res);
          return { errors: true };
        } catch (err) {
          if (err instanceof SyntaxError) {
            this._logger.verbose('CHECKOUT: Failed to parse body, not typeof JSON');
            const $ = cheerio.load(body);
            let data;
            if (statusCode === 202) {
              data = $('input[name="checkout_url"]').val();
              this._logger.silly('CHECKOUT: 202 response data: %j', data);
              if (data) {
                // parse out what we need
                // eslint-disable-next-line prefer-destructuring
                this.storeId = data.split('/')[3];
                // eslint-disable-next-line prefer-destructuring
                this.checkoutTokens.push(data.split('/')[5]);
                return { errors: null };
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
                return { errors: null };
              }
            }
            this._logger.verbose(
              'CHECKOUT: Failed: Queue responded with status code: %s',
              statusCode,
            );
            return { errors: true };
          }
          this._logger.verbose('CHECKOUT: Failed to parse body: %j', err);
          return { errors: true };
        }
      }
      this._logger.verbose('CHECKOUT: Not passed queue, delaying %d ms', Delays.PollCheckoutQueue);
      return { status: 303 };
    } catch (err) {
      this._logger.debug('CHECKOUT: Error polling queue: %s', err.error);
      return { errors: true };
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
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return { nextState: States.Aborted };
    }

    this._checkoutMethod = getCheckoutMethod(this._context.task.site, this._logger);

    let checkout;
    switch (this._checkoutMethod) {
      case CheckoutMethods.Api: {
        checkout = new APICheckout(this._context);
        break;
      }
      case CheckoutMethods.Frontend: {
        checkout = new FrontendCheckout(this._context);
        break;
      }
      default: {
        this._logger.verbose(
          'CHECKOUT: Unable to determine checkout mode %s, retrying...',
          this._checkoutMethod,
        );
        return { nextState: States.Errored };
      }
    }
    if (checkout) {
      checkout.run();
    }
  }
}

module.exports = Checkout;
