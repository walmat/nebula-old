/* eslint-disable camelcase */
const _ = require('underscore');
const cheerio = require('cheerio');

const {
  formatProxy,
  getHeaders,
  now,
  stateForStatusCode,
  waitForDelay,
  userAgent,
} = require('../utils');
const {
  createCheckoutForm,
  buildPaymentForm,
  patchToCart,
  paymentReviewForm,
  postPaymentAPI,
} = require('../utils/forms');
const { States } = require('../utils/constants').TaskRunner;
const { CheckoutTimeouts, ShopifyPaymentSteps } = require('../utils/constants').Checkout;

const Checkout = require('../checkout');

class APICheckout extends Checkout {
  constructor(context) {
    super(context);
    this._context = context;
    this._logger = this._context.logger;
    this._request = this._context.request;
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
        return { message: 'Creating checkout', nextState: States.CreateCheckout };
      }
      return { message: 'Failed: Generating payment token', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('CHECKOUT: Error getting payment token: %s', err);
      return { message: 'Failed: Generating payment token', nextState: States.Stopped };
    }
  }

  async createCheckout() {
    const { site, profile } = this._context.task;
    const { shipping, billing, payment } = profile;

    try {
      const res = await this._request({
        uri: `${site.url}/wallets/checkouts`,
        method: 'POST',
        proxy: formatProxy(this._context.proxy),
        simple: false,
        json: false,
        encoding: null,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers: getHeaders(site),
        body: createCheckoutForm(profile, shipping, billing, payment),
      });

      // check for soft ban
      const { statusCode } = res;
      let { body } = res;

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }

      // let's try to parse the response if not
      try {
        body = JSON.parse(res.body.toString());

        if (body.errors) {
          this._logger.verbose('CHECKOUT: Failed: Creating checkout session: %j', body.errors);
          return { message: 'Invalid address, stopping...', nextState: States.Stopped };
        }

        if (body.checkout) {
          const { checkout } = body;
          const { clone_url } = checkout;
          this._logger.verbose('CHECKOUT: Created checkout token: %s', clone_url.split('/')[5]);
          [, , , this.storeId] = clone_url.split('/');
          [, this.paymentUrlKey] = checkout.web_url.split('=');
          const [, , , , , newToken] = clone_url.split('/');
          this.checkoutTokens.push(newToken);

          if (this._context.task.product.variants) {
            return { message: 'Fetching shipping rates', nextState: States.AddToCart };
          }
          return { message: 'Monitoring for product', nextState: States.Monitor };
        }
        // might not ever get called, but just a failsafe
        this._logger.debug('Failed: Creating checkout session %j', res.body.toString());
        return { message: 'Failed: Creating checkout', nextState: States.Stopped };
      } catch (err) {
        this._logger.debug('CHECKOUT: Error creating checkout: %j', err);
        return { message: 'Failed: Creating checkout', nextState: States.Stopped };
      }
    } catch (err) {
      this._logger.debug('CHECKOUT: Error creating checkout: %j', err);
      return { message: 'Failed: Creating checkout', nextState: States.Stopped };
    }
  }

  async addToCart() {
    const { site, product, monitorDelay } = this._context.task;
    const { url } = site;

    if (this.checkoutToken || this.checkoutTokens.length > 0) {
      this._logger.verbose('API CHECKOUT: Adding to cart');
      this.checkoutToken = this.checkoutToken || this.checkoutTokens.pop();
      try {
        const res = await this._request({
          uri: `${url}/wallets/checkouts/${this.checkoutToken}.json`,
          method: 'PATCH',
          proxy: formatProxy(this._context.proxy),
          simple: false,
          json: true,
          rejectUnauthorized: false,
          resolveWithFullResponse: true,
          headers: getHeaders(site),
          body: patchToCart(product.variants[0], site),
        });

        const { statusCode } = res;
        const checkStatus = stateForStatusCode(statusCode);
        if (checkStatus) {
          return { message: checkStatus.message, nextState: checkStatus.nextState };
        }

        if (res.body.errors && res.body.errors.line_items[0]) {
          const error = res.body.errors.line_items[0];
          this._logger.debug('Error adding to cart: %j', error);
          if (error.quantity) {
            await waitForDelay(monitorDelay);
            return { message: 'Running for restocks', nextState: States.AddToCart };
          }
          if (error.variant_id && error.variant_id[0]) {
            await waitForDelay(monitorDelay);
            return { message: 'Running for restocks', nextState: States.AddToCart };
          }
          return { message: 'Failed: Add to cart', nextState: States.Stopped };
        }

        if (res.body.checkout && res.body.checkout.line_items.length > 0) {
          this._logger.verbose('Successfully added to cart');
          const { total_price } = res.body.checkout;
          this.prices.item = parseFloat(total_price).toFixed(2);
          this._context.timer.reset();
          this._context.timer.start(now());
          return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
        }
        return { message: 'Failed: Add to cart', nextState: States.Stopped };
      } catch (err) {
        this._logger.debug('API CHECKOUT: Request error adding to cart %j', err);
        return { message: 'Failed: Add to cart', nextState: States.Stopped };
      }
    }
    this._logger.verbose('API CHECKOUT: Invalid checkout session');
    return { message: 'Creating checkout', nextState: States.CreateCheckout };
  }

  async shippingRates() {
    this._logger.verbose('API CHECKOUT: Fetching shipping rates');
    const { site, monitorDelay } = this._context.task;
    const { url } = site;

    if (this._context.timer.getRunTime(now()) > 10000) {
      return { message: 'Country not supported', nextState: States.Stopped };
    }

    try {
      const res = await this._request({
        uri: `${url}/wallets/checkouts/${this.checkoutToken}/shipping_rates.json`,
        proxy: formatProxy(this._context.proxy),
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        json: true,
        simple: false,
        method: 'get',
        headers: getHeaders(site),
      });

      const { statusCode, body } = res;

      // extra check for country not supported
      if (statusCode === 422) {
        return { message: 'Country not supported', nextState: States.Stopped };
      }

      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }

      if (body && body.errors) {
        const { errors } = res;
        this._logger.verbose('CHECKOUT: Error getting shipping rates: %j', errors);
        await waitForDelay(monitorDelay);
        return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
      }

      if (body && body.shipping_rates && body.shipping_rates.length > 0) {
        const { shipping_rates: shippingRates } = body;
        shippingRates.forEach(rate => {
          this.shippingMethods.push(rate);
        });

        const cheapest = _.min(this.shippingMethods, rate => rate.price);
        const { id, title } = cheapest;
        this.chosenShippingMethod = { id, name: title };
        this._logger.verbose('CHECKOUT: Using shipping method: %s', this.chosenShippingMethod.name);

        // set shipping price for cart
        let { shipping } = this.prices;
        shipping = parseFloat(cheapest.price).toFixed(2);
        this._logger.silly('CHECKOUT: Shipping total: %s', shipping);
        return {
          message: `Using rate ${this.chosenShippingMethod.name}`,
          nextState: States.PaymentGateway,
        };
      }
      this._logger.verbose('No shipping rates available, polling %d ms', monitorDelay);
      await waitForDelay(monitorDelay);
      return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error fetching shipping method: %j', err);
      return { message: 'Failed: Fetching shipping rates', nextState: States.Stopped };
    }
  }

  async paymentGateway() {
    this._logger.verbose('CHECKOUT: Finding payment gateway');
    const { site, monitorDelay } = this._context.task;
    const { url, apiKey } = site;
    const { item, shipping } = this.prices;
    let { total } = this.prices;

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

    // log total price of cart, maybe show this in analytics when we get that setup in the future
    total = (parseFloat(item) + parseFloat(shipping)).toFixed(2);
    this._logger.silly('CHECKOUT: Cart total: %s', total);

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}?key=${
          this.paymentUrlKey
        }&previous_step=shipping_method&step=payment_method`,
        method: 'get',
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        proxy: formatProxy(this._context.proxy),
        headers,
      });

      // check if redirected to `/account/login` page
      if (res && res.request && res.request.uri) {
        if (res.request.uri.href.indexOf('account') > -1) {
          if (this._context.task.username && this._context.task.password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required, stopping...', nextState: States.Stopped };
        }
      }

      const { statusCode, body } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }

      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      let step = $('.step').attr('data-step');
      if (!step) {
        step = $('#step').attr('data-step');
      }

      this._logger.silly('CHECKOUT: 1st request step: %s', step);
      if (step === ShopifyPaymentSteps.ContactInformation) {
        return { message: 'Waiting for captcha', nextState: States.RequestCaptcha };
      }
      if (step === ShopifyPaymentSteps.PaymentMethod) {
        this.gateway = $(".radio-wrapper.content-box__row[data-gateway-group='direct']").attr(
          'data-select-gateway',
        );
        this._logger.silly('CHECKOUT: Found payment gateway: %s', this.gateway);
        return { message: 'Posting payment', nextState: States.PostPayment };
      }
      await waitForDelay(monitorDelay);
      return { message: 'Polling for payment gateway', nextState: States.PaymentGateway };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error fetching payment gateway: %j', err);
      return { message: 'Failed: Fetching payment gateway', nextState: States.Stopped };
    }
  }

  async postPayment() {
    this._logger.verbose('CHECKOUT: Handling post payment step');
    const { site } = this._context.task;
    const { url, apiKey } = site;
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

    const { id } = this.chosenShippingMethod;
    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}?key=${this.paymentUrlKey}`,
        method: 'post',
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        proxy: formatProxy(this._context.proxy),
        headers,
        formData: postPaymentAPI(this.paymentTokens.pop(), this.gateway, id, this.captchaToken),
      });

      const { statusCode, body } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }

      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      let step = $('.step').attr('data-step');
      if (!step) {
        step = $('#step').attr('data-step');
      }

      this._logger.silly('CHECKOUT: 2nd request step: %s', step);
      if (step === ShopifyPaymentSteps.ContactInformation) {
        this._logger.verbose('CHECKOUT: Captcha failed, harvesting...');
        return { message: 'Waiting for captcha', nextState: States.RequestCaptcha };
      }

      if (step === ShopifyPaymentSteps.Review) {
        this._logger.verbose('CHECKOUT: Review step found, submitting');
        return { message: 'Posting payment review', nextState: States.PaymentReview };
      }
      this._context.timer.reset();
      this._context.timer.start(now());
      return { message: 'Processing payment', nextState: States.PaymentProcess };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error during post payment: %j', err);
      return { message: 'Failed: Posting payment', nextState: States.Stopped };
    }
  }

  async paymentReview() {
    this._logger.verbose('API CHECKOUT: Handling review payment step');
    const { site } = this._context.task;
    const { url, apiKey } = site;
    const { item, shipping } = this.prices;
    let { total } = this.prices;

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

    total = (parseFloat(item) + parseFloat(shipping)).toFixed(2);
    this._logger.silly('CHECKOUT: Cart total: %s', total);

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}?key=${
          this.paymentUrlKey
        }&step=review`,
        method: 'post',
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        proxy: formatProxy(this._context.proxy),
        headers,
        formData: paymentReviewForm(total, this.captchaToken),
      });

      const { statusCode } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
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
module.exports = APICheckout;
