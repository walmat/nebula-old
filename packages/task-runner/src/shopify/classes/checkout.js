/* eslint-disable class-methods-use-this */
/* eslint-disable camelcase */
const cheerio = require('cheerio');
const _ = require('underscore');
const path = require('path');
const fs = require('fs');
const {
  waitForDelay,
  formatProxy,
  userAgent,
  now,
  checkStatusCode,
  isFrontendMode,
} = require('./utils');
const {
  buildPaymentForm,
  createCheckoutForm,
  addToCart,
  patchToCart,
  submitCustomerInformation,
  paymentMethodForm,
  paymentReviewForm,
} = require('./utils/forms');
const {
  CheckoutTimeouts,
  Delays,
  ShopifyPaymentSteps,
} = require('../classes/utils/constants').Checkout;
const { CheckoutErrorCodes } = require('./utils/constants').ErrorCodes;

class Checkout {
  get headers() {
    return this._headers;
  }

  constructor(context) {
    this._context = context;
    this._id = this._context.id;
    this._task = this._context.task;
    this._proxy = this._context.proxy;
    this._request = this._context.request;
    this._logger = this._context.logger;

    this._paymentTokens = [];
    this._shippingMethods = [];
    this._chosenShippingMethod = {
      name: null,
      id: null,
    };
    this._checkoutTokens = [];
    this._checkoutToken = null;

    this._storeId = null;
    this._paymentUrlKey = null;
    this._basicAuth = Buffer.from(`${this._task.site.apiKey}::`).toString('base64');
    this._prices = {
      item: 0,
      shipping: 0,
      total: 0,
    };
    this._gateway = '';
    this._captchaToken = '';
  }

  _headers() {
    const { site } = this._task;
    const { url, apiKey } = site;
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Shopify-Checkout-Version': '2016-09-06',
      'X-Shopify-Access-Token': `${apiKey}`,
      'User-Agent': userAgent,
      host: `${url.split('/')[2]}`,
      authorization: `Basic ${this._basicAuth}`,
    };
  }

  /**
   * Called 5 times at the start of the task
   * Generates a payment token using the task data provided from the task runner
   * @returns {String} payment token
   */
  async handleGeneratePaymentToken() {
    const { payment, billing } = this._task.profile;
    this._logger.verbose('CHECKOUT: Generating Payment Token');
    try {
      const res = await this._request({
        uri: `https://elb.deposit.shopifycs.com/sessions`,
        followAllRedirects: true,
        proxy: formatProxy(this._proxy),
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
        this._paymentTokens.push(body.id);
        return body.id;
      }
      return null;
    } catch (err) {
      this._logger.debug('CHECKOUT: Error getting payment token: %s', err);
      return null;
    }
  }

  /**
   * API MODE
   * Create a valid checkout token with user data
   */
  async handleCreateCheckout() {
    this._logger.verbose('CHECKOUT: Creating checkout token');

    const { site, profile } = this._task;
    const { shipping, billing, payment } = profile;

    const headers = {
      ...this._headers(),
      'cache-control': 'no-store',
    };

    try {
      const res = await this._request({
        uri: `${site.url}/wallets/checkouts`,
        method: 'POST',
        proxy: formatProxy(this._proxy),
        simple: false,
        json: false,
        encoding: null,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers,
        body: createCheckoutForm(profile, shipping, billing, payment),
      });
      // check for soft ban
      const { statusCode } = res;
      let { body } = res;
      if (checkStatusCode(statusCode)) {
        return { status: statusCode, error: true };
      }

      // did we receive a queue response?
      if (body.toString().indexOf('/poll') > -1) {
        /**
         * <html><body>You are being <a href="https://yeezysupply.com/checkout/poll">redirected</a>.</body></html>
         */
        this._logger.verbose('CHECKOUT: Checkout queue, polling %d ms', Delays.PollCheckoutQueue);
        return { status: 303, error: null };
      }

      // let's try to parse the response if not
      try {
        body = JSON.parse(res.body.toString());
        if (body.checkout) {
          const { checkout } = body;
          const { clone_url } = checkout;
          this._logger.verbose('CHECKOUT: Created checkout token: %s', clone_url.split('/')[5]);
          // eslint-disable-next-line prefer-destructuring
          this._storeId = clone_url.split('/')[3];
          // eslint-disable-next-line prefer-destructuring
          this._paymentUrlKey = checkout.web_url.split('=')[1];
          // push the checkout token to the stack
          this._checkoutTokens.push(clone_url.split('/')[5]);
          return { res: clone_url.split('/')[5] };
        }
        // might not ever get called, but just a failsafe
        this._logger.debug('Failed: Creating checkout session %s', res);
        return { status: 400, error: true };
      } catch (err) {
        this._logger.debug('CHECKOUT: Error creating checkout: %s', err);
        return { error: true, status: 400 };
      }
    } catch (err) {
      this._logger.debug('CHECKOUT: Error creating checkout: %s', err);
      return { error: 400 };
    }
  }

  /**
   * Request to login to an account on Shopify sites
   */
  async handleLogin() {
    const { site, username, password } = this._task;
    const { url } = site;
    this._logger.verbose('CHECKOUT: Starting login request to %s', url);

    try {
      const res = await this._request({
        uri: `${url}/account/login`,
        method: 'post',
        simple: true,
        followAllRedirects: true,
        proxy: formatProxy(this._proxy),
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
      });

      const { statusCode, request, headers } = res;
      if (checkStatusCode(statusCode)) {
        return false;
      }
      this._logger.verbose('ACCOUNT: Login response cookies: %j', headers['set-cookie']);
      const { href } = request;
      if (href.indexOf('login') > -1) {
        return false;
      }
      this._logger.info('Logged in! Proceeding to add to cart');
      return true;
    } catch (err) {
      this._logger.verbose('CHECKOUT: Request error with login: %j', err);
      return false;
    }
  }

  /**
   * Handles waiting in a checkout queue for Shopify
   * @returns {} || `Checkout Session`
   */
  async pollCheckoutQueue() {
    this._logger.verbose('CHECKOUT: Waiting in queue');
    const { site } = this._task;
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
        headers: this._headers(),
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
            this._storeId = clone_url.split('/')[3];
            // eslint-disable-next-line prefer-destructuring
            this._paymentUrlKey = checkout.web_url.split('=')[1];
            // push the checkout token to the stack
            this._checkoutTokens.push(clone_url.split('/')[5]);
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
                this._storeId = data.split('/')[3];
                // eslint-disable-next-line prefer-destructuring
                this._checkoutTokens.push(data.split('/')[5]);
                return true;
              }
            }
            if (statusCode === 303) {
              data = $('input').attr('href');
              this._logger.silly('CHECKOUT: 303 response data: %j', data);
              if (data) {
                // eslint-disable-next-line prefer-destructuring
                this._storeId = data.split('/')[3];
                // eslint-disable-next-line prefer-destructuring
                this._checkoutTokens.push(data.split('/')[5]);
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

  async handleAddToCart() {
    const { site, product } = this._task;
    const { variants } = product;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/cart/add.js`,
        resolveWithFullResponse: true,
        followAllRedirects: true,
        simple: false,
        json: true,
        proxy: formatProxy(this._proxy),
        method: 'post',
        headers: {
          Origin: url,
          'User-Agent': userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
        },
        formData: addToCart(variants[0], site),
      });

      const { statusCode, body } = res;
      if (checkStatusCode(statusCode)) {
        return { error: true, status: statusCode };
      }
      const { status, description, line_price } = body;

      if (status === 404) {
        this._logger.debug('CHECKOUT: Error in add to cart: %s', description);
        return { error: true, status: 404 };
      }

      this._prices.item = line_price;
      console.log(this._prices.item);
      this._task.product.url = `${url}/${res.body.url.split('?')[0]}`;
      return { error: false };
    } catch (err) {
      this._logger.debug('CART: Request error in add to cart: %s', err);
      return { error: true };
    }
  }

  /**
   * @example
   * PATCH https://kith.com/wallets/checkouts/43b62a79f39872f9a0010fc9cb8967c6.json
   * payload: {"checkout":{"line_items":[{"variant_id":17402579058757,"quantity":"1","properties":{"MVZtkB3gY9f5SnYz":"nky2UHRAKKeTk8W8"}}]}}
   */
  async handlePatchCart() {
    const { site, product } = this._task;

    if (this._checkoutToken || this._checkoutTokens.length > 0) {
      this._logger.verbose('CHECKOUT: Adding to cart');
      this._checkoutToken = this._checkoutToken || this._checkoutTokens.pop();
      try {
        const res = await this._request({
          uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}.json`,
          method: 'PATCH',
          proxy: formatProxy(this._proxy),
          simple: false,
          json: true,
          rejectUnauthorized: false,
          resolveWithFullResponse: true,
          headers: this._headers(),
          body: patchToCart(product.variants[0], site),
        });

        const { statusCode } = res;
        if (checkStatusCode(statusCode)) {
          return { status: statusCode };
        }

        if (res.body.errors && res.body.errors.line_items[0]) {
          const error = res.body.errors.line_items[0];
          this._logger.debug('Error adding to cart: %j', error);
          if (error.quantity) {
            return { errors: CheckoutErrorCodes.OOS };
          }
          if (error.variant_id && error.variant_id[0]) {
            return { errors: CheckoutErrorCodes.MonitorForVariant };
          }
          return { errors: true };
        }

        if (res.body.checkout && res.body.checkout.line_items.length > 0) {
          this._logger.verbose('Successfully added to cart');
          const { total_price } = res.body.checkout;
          this._prices.item = total_price;
          console.log(this._prices.item);
          return { errors: null };
        }

        return { errors: CheckoutErrorCodes.ATC };
      } catch (err) {
        this._logger.debug('CHECKOUT: Request error adding to cart %j', err);
        return { errors: true };
      }
    }
    this._logger.verbose('CHECKOUT: Invalid checkout session');
    return { errors: CheckoutErrorCodes.InvalidCheckoutSession };
  }

  async handleProceedToCheckout() {
    this._logger.verbose('CHECKOUT: Proceeding to checkout');
    const { site } = this._task;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/cart`,
        proxy: formatProxy(this._proxy),
        followAllRedirects: false,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        json: false,
        simple: false,
        method: 'post',
        headers: this._headers(),
        formData: {
          'updates[]': 1,
          checkout: 'Proceed to checkout',
        },
      });

      const { statusCode } = res;
      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }

      const { href } = res.request;
      if (href.indexOf('checkouts') > -1) {
        // eslint-disable-next-line prefer-destructuring
        this._storeId = href.split('/')[3];
        // eslint-disable-next-line prefer-destructuring
        this._checkoutTokens.push(href.split('/')[5]);
        return { error: null };
      }
      return { error: true };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error proceeding to checkout');
      return { error: true };
    }
  }

  /**
   * @example
   * GET https://kith.com/wallets/checkouts/43b62a79f39872f9a0010fc9cb8967c6/shipping_rates.json
   */
  async handleGetShippingRates() {
    this._logger.verbose('CHECKOUT: Fetching shipping rates');
    const { site, profile } = this._task;
    const { url } = site;
    const { shipping } = profile;
    const { country, state, zipCode } = shipping;

    let res;
    try {
      if (isFrontendMode(site)) {
        res = await this._request({
          uri: `${this._task.site.url}/cart/shipping_rates.json`,
          proxy: formatProxy(this._proxy),
          followAllRedirects: true,
          simple: false,
          json: true,
          resolveWithFullResponse: true,
          method: 'get',
          headers: {
            Origin: url,
            'User-Agent': userAgent,
          },
          qs: {
            'shipping_address[zip]': zipCode,
            'shipping_address[country]': country.value,
            'shipping_address[province]': state.value,
          },
        });
      } else {
        res = await this._request({
          uri: `${url}/wallets/checkouts/${this._checkoutToken}/shipping_rates.json`,
          proxy: formatProxy(this._proxy),
          followAllRedirects: true,
          resolveWithFullResponse: true,
          rejectUnauthorized: false,
          json: true,
          simple: false,
          method: 'get',
          headers: this._headers(),
        });
      }

      const { statusCode, body } = res;
      const { shipping_rates } = body;

      // extra check for carting
      if (statusCode === 422) {
        return { status: statusCode };
      }

      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }

      if (body && body.errors) {
        this._logger.verbose('CHECKOUT: Error getting shipping rates: %j', body.errors);
        return { errors: CheckoutErrorCodes.ShippingRates };
      }

      if (body && shipping_rates) {
        shipping_rates.forEach(rate => {
          this._shippingMethods.push(rate);
        });

        const cheapest = _.min(this._shippingMethods, rate => rate.price);
        if (isFrontendMode(site)) {
          const { name } = cheapest;
          const id = `${cheapest.source}-${cheapest.name.replace('%20', ' ')}-${cheapest.price}`;
          this._chosenShippingMethod = { id, name };
        } else {
          const { id, title } = cheapest;
          this._chosenShippingMethod = { id, name: title };
        }
        this._logger.verbose(
          'CHECKOUT: Using shipping method: %s',
          this._chosenShippingMethod.name,
        );

        // set shipping price for cart
        this._prices.shipping = cheapest.price;
        this._logger.silly('CHECKOUT: Shipping total: %s', shipping);
        return { errors: null, rate: this._chosenShippingMethod.name };
      }
      this._logger.verbose('No shipping rates available, polling %d ms', Delays.PollShippingRates);
      return { errors: CheckoutErrorCodes.ShippingRates };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error fetching shipping method: %j', err);
      return { errors: true };
    }
  }

  /**
   * Handle CAPTCHA requests
   */
  async _handleRequestCaptcha() {
    this._logger.verbose('CHECKOUT: Getting Solved Captcha...');
    const token = await this._context.getCaptcha();
    if (token) {
      this._logger.verbose('CHECKOUT: Received token from captcha harvesting: %s', token);
      this._captchaToken = token;
      return { errors: null };
    }
    return { errors: true };
  }

  async handleSubmitCustomerInformation() {
    this._logger.verbose('CHECKOUT: Submitting customer information');
    const { site, profile } = this._task;
    const { payment, shipping } = profile;
    const { url } = site;

    try {
      if (this._checkoutTokens.length && !this._checkoutToken) {
        this._checkoutToken = this._checkoutTokens.pop();
      }
      const res = await this._request({
        uri: `${url}/${this._storeId}/checkouts/${this._checkoutToken}`,
        method: 'post',
        proxy: formatProxy(this._proxy),
        followAllRedirects: true,
        resolveWithFullResponse: true,
        simple: false,
        headers: {
          Origin: `${url}`,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': userAgent,
        },
        formData: submitCustomerInformation(payment, shipping, this._captchaToken),
      });

      const { statusCode, body } = res;
      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }

      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      let step = $('.step').attr('data-step');
      if (!step) {
        step = $('#step').attr('data-step');
      }
      if (step === ShopifyPaymentSteps.ContactInformation) {
        return { error: CheckoutErrorCodes.InvalidCaptchaToken };
      }
      return { error: null };
    } catch (err) {
      this._logger.verbose('CHECKOUT: Request error submitting customer information %j', err);
      return { error: true };
    }
  }

  /**
   * @example
   * Steps (API):
   * 1. GET `https://blendsus.com/1529745/checkouts/6eb86de0a19e7d50ec27859a7d43a0e8?previous_step=shipping_method&step=payment_method`
   * 2. POST `https://blendsus.com/1529745/checkouts/6eb86de0a19e7d50ec27859a7d43a0e8`
   * 3. POST `https://blendsus.com/1529745/checkouts/6eb86de0a19e7d50ec27859a7d43a0e8`
   * 4. GET `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}/payments`
   */
  async handleGetPaymentGateway() {
    this._logger.verbose('CHECKOUT: Finding payment gateway');
    const { site } = this._task;
    const { url, apiKey } = site;
    const { item, shipping } = this._prices;
    let { total } = this._prices;
    const headers = {
      ...this._headers(),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${apiKey}`,
    };

    // log total price of cart, maybe show this in analytics when we get that setup in the future
    total = parseFloat(item) + parseFloat(shipping);
    this._logger.silly('CHECKOUT: Cart total: %s', total);

    let res;
    try {
      if (isFrontendMode(site)) {
        res = await this._request({
          uri: `${url}/${this._storeId}/checkouts/${
            this._checkoutToken
          }?previous_step=shipping_method&step=payment_method`,
          method: 'get',
          followAllRedirects: true,
          resolveWithFullResponse: true,
          rejectUnauthorized: false,
          proxy: formatProxy(this._proxy),
          headers,
        });
      } else {
        res = await this._request({
          uri: `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${
            this._paymentUrlKey
          }&previous_step=shipping_method&step=payment_method`,
          method: 'get',
          followAllRedirects: true,
          resolveWithFullResponse: true,
          rejectUnauthorized: false,
          proxy: formatProxy(this._proxy),
          headers,
        });
      }
      fs.writeFileSync(path.join(__dirname, 'test.html'), res.body);

      const { statusCode, body } = res;
      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }

      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      let step = $('.step').attr('data-step');
      if (!step) {
        step = $('#step').attr('data-step');
      }

      this._logger.silly('CHECKOUT: 1st request step: %s', step);
      if (step === ShopifyPaymentSteps.ContactInformation) {
        return { errors: CheckoutErrorCodes.InvalidCaptchaToken };
      }
      if (step === ShopifyPaymentSteps.PaymentMethod) {
        this._gateway = $(".radio-wrapper.content-box__row[data-gateway-group='direct']").attr(
          'data-select-gateway',
        );
        this._logger.silly('CHECKOUT: Found payment gateway: %s', this._gateway);
        return { errors: null };
      }
      return { errors: CheckoutErrorCodes.InvalidGateway };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error fetching payment gateway: %j', err);
      return { errors: true };
    }
  }

  async handlePostPayment() {
    this._logger.verbose('CHECKOUT: Handling post payment step');
    const { site } = this._task;
    const { url, apiKey } = site;
    const headers = {
      ...this._headers(),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${apiKey}`,
    };

    const { id } = this._chosenShippingMethod;
    let res;
    try {
      if (isFrontendMode(site)) {
        res = await this._request({
          uri: `${url}/${this._storeId}/checkouts/${
            this._checkoutToken
          }?previous_step=payment_method`,
          method: 'post',
          followAllRedirects: true,
          resolveWithFullResponse: true,
          rejectUnauthorized: false,
          proxy: formatProxy(this._proxy),
          headers,
          formData: paymentMethodForm(
            this._paymentTokens.pop(),
            this._gateway,
            id,
            this._captchaToken,
            this._prices.total,
          ),
        });
      }
      res = await this._request({
        uri: `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._paymentUrlKey}`,
        method: 'post',
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        proxy: formatProxy(this._proxy),
        headers,
        formData: paymentMethodForm(
          this._paymentTokens.pop(),
          this._gateway,
          id,
          this._captchaToken,
        ),
      });

      fs.writeFileSync(path.join(__dirname, 'yep.html'), res.body);

      const { statusCode, body } = res;
      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }

      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      let step = $('.step').attr('data-step');
      if (!step) {
        step = $('#step').attr('data-step');
      }

      this._logger.silly('CHECKOUT: 2nd request step: %s', step);

      if (step === ShopifyPaymentSteps.ContactInformation) {
        this._logger.verbose('CHECKOUT: Captcha failed, retrying');
        return { errors: CheckoutErrorCodes.InvalidCaptchaToken };
      }

      if (step === ShopifyPaymentSteps.Review) {
        this._logger.verbose('CHECKOUT: Review step found, submitting');
        return { errors: CheckoutErrorCodes.Review };
      }
      return { errors: null };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error during post payment: %j', err);
      return { errors: true };
    }
  }

  async handlePaymentReview() {
    this._logger.verbose('CHECKOUT: Handling review payment step');
    const { site } = this._task;
    const { url, apiKey } = site;
    const { item, shipping } = this._prices;
    let { total } = this._prices;
    const headers = {
      ...this._headers(),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${apiKey}`,
    };

    // log total price of cart, maybe show this in analytics when we get that setup in the future
    total = parseFloat(item) + parseFloat(shipping);
    this._logger.silly('CHECKOUT: Cart total: %s', total);

    try {
      const res = await this._request({
        uri: `${url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${
          this._paymentUrlKey
        }&step=review`,
        method: 'post',
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        proxy: formatProxy(this._proxy),
        headers,
        formData: paymentReviewForm(total, this._captchaToken),
      });

      const { statusCode } = res;
      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }
      return { errors: null };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error during review payment: %j', err);
      return { errors: true };
    }
  }

  async handleProcessing() {
    const { timer } = this._context;
    const { site } = this._task;
    const { url, apiKey } = site;
    if (timer.getRunTime(now()) > CheckoutTimeouts.ProcessingPayment) {
      return { errors: CheckoutErrorCodes.Timeout };
    }

    const headers = {
      ...this._headers(),
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
        uri: `${url}/wallets/checkouts/${this._checkoutToken}/payments`,
        method: 'GET',
        proxy: formatProxy(this._proxy),
        simple: false,
        json: true,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers,
      });
      const { statusCode, body } = res;
      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }
      this._logger.verbose('CHECKOUT: Payments object: %j', body);
      const { payments } = body;
      if (body && payments[0]) {
        const { payment_processing_error_message } = payments[0];
        this._logger.verbose('CHECKOUT: Payment error: %j', payment_processing_error_message);
        if (payment_processing_error_message) {
          return { errors: CheckoutErrorCodes.CardDeclined };
        }
        if (payments[0].transaction && payments[0].transaction.status !== 'success') {
          const { transaction } = payments[0];
          this._logger.verbose('CHECKOUT: Payment error: %j', transaction);
          return { errors: CheckoutErrorCodes.CardDeclined };
        }
        return { errors: null };
      }
      this._logger.verbose('CHECKOUT: Processing payment');
      return { errors: CheckoutErrorCodes.Processing };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error failed processing payment: %s', err);
      return { errors: true };
    }
  }
}

module.exports = Checkout;
