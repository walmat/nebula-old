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
    const { site, username, password, monitorDelay } = this._context.task;
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
          authenticity_token: '',
          'g-recaptcha-response': this.captchaToken,
        },
      });

      const { statusCode, request, headers } = res;
      const { href } = request;

      if (href.indexOf('password') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Password page', nextState: States.Login };
      }
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }

      if (href.indexOf('challenge') > -1) {
        this._logger.verbose('CHECKOUT: Login needs captcha');
        // TODO - find out if this is needed later on
        // const $ = cheerio.load(res.body);
        // const authToken = $('form input[name="authenticity_token"]').attr('value');
        // this.authTokens.push(authToken);
        return { message: 'Captcha needed for login', nextState: States.RequestCaptcha };
      }

      if (href.indexOf('login') > -1) {
        this._logger.verbose('CHECKOUT: Invalid login credentials');
        return { message: 'Invalid login, stopping...', nextState: States.Stopped };
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
   * Handles waiting in a checkout queue for Shopify
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
        followAllRedirects: false,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers: {
          ...getHeaders(site),
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': 1,
        },
      });

      const { statusCode } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }
      let { body } = res;

      this._logger.silly('CHECKOUT: Queue response body: %j', body);

      // out of queue case
      // TODO – find a better way to check against empty object body
      if (JSON.parse(JSON.stringify(body)) !== '{}' && !body.indexOf('throttle') > -1) {
        this._logger.verbose('CHECKOUT: Queue bypassed');
        try {
          body = JSON.parse(body);
          this._logger.verbose('CHECKOUT: Queue JSON body: %j', body);
          if (body.checkout) {
            const { checkout } = body;
            const { clone_url: cloneUrl } = checkout;
            this._logger.verbose(
              'CHECKOUT: Created checkout token after queue: %s',
              cloneUrl.split('/')[5],
            );
            [, , , this.storeId] = cloneUrl.split('/');
            [, this.paymentUrlKey] = checkout.web_url.split('=');
            const [, , , , , newToken] = cloneUrl.split('/');
            this.checkoutTokens.push(newToken);
            return { message: 'Monitoring for product', nextState: States.Monitor };
          }
          // might not ever get called, but just a failsafe
          this._logger.verbose('Failed: Creating checkout session after queue %s', res);
          return { message: 'Failed: Creating checkout', nextState: States.Stopped };
        } catch (err) {
          // Frontend queue response
          if (err instanceof SyntaxError) {
            this._logger.verbose('CHECKOUT: Failed to parse body, not typeof JSON');
            const $ = cheerio.load(body);
            let data;
            if (statusCode === 202) {
              data = $('input[name="checkout_url"]').val();
              this._logger.silly('CHECKOUT: 202 response data: %j', data);
              if (data) {
                [, , , this.storeId] = data.split('/');
                const [, , , , , newToken] = data.split('/');
                this.checkoutTokens.push(newToken);
                return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
              }
            }
            if (statusCode === 303) {
              data = $('input').attr('href');
              this._logger.silly('CHECKOUT: 303 response data: %j', data);
              if (data) {
                [, , , this.storeId] = data.split('/');
                const [, , , , , newToken] = data.split('/');
                this.checkoutTokens.push(newToken);
                return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
              }
            }
            this._logger.verbose(
              'CHECKOUT: Failed: Queue responded with status code: %s',
              statusCode,
            );
            return { message: 'Failed: Polling queue', nextState: States.Stopped };
          }
          this._logger.verbose('CHECKOUT: Failed to parse body: %j', err);
          return { message: 'Failed: Polling queue', nextState: States.Stopped };
        }
      }
      this._logger.verbose('CHECKOUT: Not passed queue, delaying %d ms', monitorDelay);
      await waitForDelay(monitorDelay);
      return { message: 'Waiting in queue', nextState: States.PollQueue };
    } catch (err) {
      this._logger.debug('CHECKOUT: Error polling queue: %s', err.error);
      return { message: 'Failed: Polling queue', nextState: States.Stopped };
    }
  }
}

module.exports = Checkout;
