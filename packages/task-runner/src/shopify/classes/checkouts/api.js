/* eslint-disable camelcase */
const _ = require('underscore');
const cheerio = require('cheerio');

const { formatProxy, getHeaders, now, checkStatusCode } = require('../utils');
const {
  createCheckoutForm,
  patchToCart,
  paymentReviewForm,
  paymentMethodForm,
} = require('../utils/forms');
const { CheckoutErrorCodes } = require('../utils/constants').ErrorCodes;
const { Delays, CheckoutTimeouts, ShopifyPaymentSteps } = require('../utils/constants').Checkout;

const Checkout = require('../checkout');

class APICheckout extends Checkout {
  constructor(context) {
    super(context);
    this._context = context;
    this._logger = this._context.logger;
    this._request = this._context.request;
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
      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }

      // did we receive a queue response?
      if (body.toString().indexOf('/poll') > -1) {
        /**
         * <html><body>You are being <a href="https://yeezysupply.com/checkout/poll">redirected</a>.</body></html>
         */
        this._logger.verbose('CHECKOUT: Checkout queue, polling %d ms', Delays.PollCheckoutQueue);
        return { status: 303 };
      }

      // let's try to parse the response if not
      try {
        body = JSON.parse(res.body.toString());
        if (body.checkout) {
          const { checkout } = body;
          const { clone_url } = checkout;
          this._logger.verbose('CHECKOUT: Created checkout token: %s', clone_url.split('/')[5]);
          // eslint-disable-next-line prefer-destructuring
          this.storeId = clone_url.split('/')[3];
          // eslint-disable-next-line prefer-destructuring
          this.paymentUrlKey = checkout.web_url.split('=')[1];
          // push the checkout token to the stack
          this.checkoutTokens.push(clone_url.split('/')[5]);
          return { errors: null };
        }
        // might not ever get called, but just a failsafe
        this._logger.debug('Failed: Creating checkout session %s', res);
        return { errors: true };
      } catch (err) {
        this._logger.debug('CHECKOUT: Error creating checkout: %s', err);
        return { errors: true };
      }
    } catch (err) {
      this._logger.debug('CHECKOUT: Error creating checkout: %s', err);
      return { code: err.statusCode, error: err };
    }
  }

  async addToCart() {
    const { site, product } = this._context.task;
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
          this.prices.item = parseFloat(total_price).toFixed(2);
          return { errors: null };
        }
        return { errors: CheckoutErrorCodes.ATC };
      } catch (err) {
        this._logger.debug('API CHECKOUT: Request error adding to cart %j', err);
        return { errors: true };
      }
    }
    this._logger.verbose('API CHECKOUT: Invalid checkout session');
    return { errors: CheckoutErrorCodes.InvalidCheckoutSession };
  }

  async shippingRates() {
    this._logger.verbose('API CHECKOUT: Fetching shipping rates');
    const { site } = this._context.task;
    const { url } = site;

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

      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }

      if (body && body.errors) {
        const { errors } = res;
        this._logger.verbose('CHECKOUT: Error getting shipping rates: %j', errors);
        return { errors: CheckoutErrorCodes.ShippingRates };
      }

      if (body && body.shipping_rates) {
        // eslint-disable-next-line camelcase
        const { shipping_rates } = body;
        shipping_rates.forEach(rate => {
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
        return { errors: null, rate: this.chosenShippingMethod.name };
      }
      this._logger.verbose('No shipping rates available, polling %d ms', Delays.PollShippingRates);
      return { errors: CheckoutErrorCodes.ShippingRates };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error fetching shipping method: %j', err);
      return { errors: true };
    }
  }

  async requestCaptcha() {
    super.requestCaptcha();
  }

  async paymentGateway() {
    this._logger.verbose('CHECKOUT: Finding payment gateway');
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
          return { errors: CheckoutErrorCodes.Account };
        }
      }

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
        this.gateway = $(".radio-wrapper.content-box__row[data-gateway-group='direct']").attr(
          'data-select-gateway',
        );
        this._logger.silly('CHECKOUT: Found payment gateway: %s', this.gateway);
        return { errors: null };
      }
      return { errors: CheckoutErrorCodes.InvalidGateway };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error fetching payment gateway: %j', err);
      return { errors: true };
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
        formData: paymentMethodForm(this.paymentTokens.pop(), this.gateway, id, this.captchaToken),
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

      this._logger.silly('CHECKOUT: 2nd request step: %s', step);
      if (step === ShopifyPaymentSteps.ContactInformation) {
        this._logger.verbose('CHECKOUT: Captcha failed, harvesting...');
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
      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }
      return { errors: null };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error during review payment: %j', err);
      return { errors: true };
    }
  }

  async paymentProcessing() {
    const { timer } = this._context;
    const { site } = this._context.task;
    const { url, apiKey } = site;
    if (timer.getRunTime(now()) > CheckoutTimeouts.ProcessingPayment) {
      return { errors: CheckoutErrorCodes.Timeout };
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
      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }
      this._logger.verbose('CHECKOUT: Payments object: %j', body);
      const { payments } = body;
      if (payments.length === 0) {
        this._logger.verbose('CHECKOUT: Processing payment');
        return { errors: CheckoutErrorCodes.Processing };
      }
      if (body && payments) {
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
module.exports = APICheckout;
