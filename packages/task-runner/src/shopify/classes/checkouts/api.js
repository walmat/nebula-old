/* eslint-disable camelcase */
const _ = require('underscore');

const { formatProxy, getHeaders, now } = require('../utils');
const { createCheckoutForm, patchToCart, paymentReviewForm } = require('../utils/forms');
const { CheckoutErrorCodes } = require('../utils/constants').ErrorCodes;
const { Delays, CheckoutTimeouts } = require('../utils/constants').Checkout;

const Checkout = require('../checkout');

class APICheckout extends Checkout {
  constructor(context) {
    super(context);
    this._context = context;
    this._logger = this._context.logger;
    this._request = this._context.request;
  }

  async login() {
    super.login();
  }

  async paymentToken() {
    super.paymentToken();
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
        headers: getHeaders(),
        body: createCheckoutForm(profile, shipping, billing, payment),
      });
      // check for soft ban
      if (res.statusCode > 400) {
        return {
          code: res.statusCode,
          error: true,
        };
      }

      // did we receive a queue response?
      if (res.body.toString().indexOf('/poll') > -1) {
        /**
         * <html><body>You are being <a href="https://yeezysupply.com/checkout/poll">redirected</a>.</body></html>
         */
        this._logger.verbose('CHECKOUT: Checkout queue, polling %d ms', Delays.PollCheckoutQueue);
        return {
          code: 303,
          error: null,
        };
      }

      // let's try to parse the response if not
      let body;
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
          return { code: 200, res: clone_url.split('/')[5] };
        }
        // might not ever get called, but just a failsafe
        this._logger.debug('Failed: Creating checkout session %s', res);
        return { code: 400, res: null };
      } catch (err) {
        this._logger.debug('CHECKOUT: Error creating checkout: %s', err);
        return { code: err.statusCode, error: err };
      }
    } catch (err) {
      this._logger.debug('CHECKOUT: Error creating checkout: %s', err);
      return { code: err.statusCode, error: err };
    }
  }

  async pollQueue() {
    super.pollQueue();
  }

  async addToCart() {
    const { site, product } = this._context.task;

    if (super._checkoutToken || super._checkoutTokens.length > 0) {
      this._logger.verbose('API CHECKOUT: Adding to cart');
      super._checkoutToken = super._checkoutToken || super._checkoutTokens.pop();
      try {
        const res = await this._request({
          uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}.json`,
          method: 'PATCH',
          proxy: formatProxy(this._proxy),
          simple: false,
          json: true,
          rejectUnauthorized: false,
          resolveWithFullResponse: true,
          headers: getHeaders(),
          body: patchToCart(product.variants[0], site),
        });

        const { statusCode } = res;
        if (this.isBanned(statusCode)) {
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
          this._prices.item = parseFloat(total_price).toFixed(2);
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
        uri: `${url}/wallets/checkouts/${super._checkoutToken}/shipping_rates.json`,
        proxy: formatProxy(this._context.proxy),
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        json: true,
        simple: false,
        method: 'get',
        headers: getHeaders(),
      });

      const { statusCode, body } = res;

      if (this.isBanned(statusCode)) {
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
          super._shippingMethods.push(rate);
        });

        const cheapest = _.min(super._shippingMethods, rate => rate.price);
        const { id, title } = cheapest;
        super._chosenShippingMethod = { id, name: title };
        this._logger.verbose(
          'CHECKOUT: Using shipping method: %s',
          super._chosenShippingMethod.name,
        );

        // set shipping price for cart
        let { shipping } = this._prices;
        shipping = parseFloat(cheapest.price).toFixed(2);
        this._logger.silly('CHECKOUT: Shipping total: %s', shipping);
        return { errors: null, rate: super._chosenShippingMethod.name };
      }
      this._logger.verbose('No shipping rates available, polling %d ms', Delays.PollShippingRates);
      return { errors: CheckoutErrorCodes.ShippingRates };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error fetching shipping method: %j', err);
      return { errors: true };
    }
  }

  async harvestCaptcha() {
    super.harvestCaptcha();
  }

  async paymentGateway() {}

  async postPayment() {
    this._logger.verbose('CHECKOUT: Handling post payment step');
    const { site } = this._context.task;
    const { url, apiKey } = site;
    const headers = {
      ...getHeaders(),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${apiKey}`,
    };

    const { id } = super._chosenShippingMethod;
    try {
      const res = await this._request({
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

      const { statusCode, body } = res;
      if (this.isBanned(statusCode)) {
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

  async paymentReview() {
    this._logger.verbose('API CHECKOUT: Handling review payment step');
    const { site } = this._context.task;
    const { url, apiKey } = site;
    const { item, shipping } = super._prices;
    let { total } = this._prices;

    const headers = {
      ...getHeaders(),
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
      if (this.isBanned(statusCode)) {
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
      if (this.isBanned(statusCode)) {
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
module.exports = APICheckout;
