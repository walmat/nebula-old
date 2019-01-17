const cheerio = require('cheerio');
const _ = require('underscore');

const Checkout = require('../checkout');
const { formatProxy, userAgent, getHeaders, checkStatusCode, now } = require('../utils');
const { addToCart, submitCustomerInformation, paymentMethodForm } = require('../utils/forms');
const { CheckoutErrorCodes } = require('../utils/constants').ErrorCodes;
const { Delays, CheckoutTimeouts, ShopifyPaymentSteps } = require('../utils/constants').Checkout;

class FrontendCheckout extends Checkout {
  constructor(context) {
    super(context);
    this._context = context;
  }

  async login() {
    super.login();
  }

  async paymentToken() {
    super.paymentToken();
  }

  async addToCart() {
    const { site, product } = this._context.task;
    const { variants } = product;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/cart/add`,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        followAllRedirects: true,
        simple: false,
        json: false,
        proxy: formatProxy(this._context.proxy),
        method: 'post',
        headers: {
          'User-Agent': userAgent,
          'Upgrade-Insecure-Requests': '1',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        },
        formData: addToCart(variants[0], site),
      });

      // check for password page
      if (res && res.request && res.request.uri) {
        if (res.request.uri.href.indexOf('password') > -1) {
          return { status: 'password' };
        }
      }

      const { statusCode } = res;
      if (checkStatusCode(statusCode)) {
        return { error: true, status: statusCode };
      }

      if (statusCode === 404) {
        return { error: true, status: 404 };
      }

      return { error: false };
    } catch (err) {
      this._logger.debug('CART: Request error in add to cart: %s', err);
      return { error: true };
    }
  }

  async createCheckout() {
    this._logger.verbose('CHECKOUT: Proceeding to checkout');
    const { site } = this._context.task;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/cart`,
        proxy: formatProxy(this._context.proxy),
        followAllRedirects: false,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        json: false,
        simple: false,
        method: 'post',
        headers: {
          'User-Agent': userAgent,
          'Upgrade-Insecure-Requests': '1',
          'Content-Type': 'application/x-www-form-urlencoded',
          Connection: 'keep-alive',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          Referer: `${url}/cart`,
        },
        formData: {
          'updates[]': 1,
          checkout: 'Proceed to Checkout',
        },
      });

      const { statusCode } = res;
      if (checkStatusCode(statusCode)) {
        return { status: statusCode };
      }

      const { href } = res.request;
      if (href.indexOf('checkouts') > -1) {
        const $ = cheerio.load(res.body);
        const recaptchaFrame = $('#g-recaptcha');
        const token = $('form.edit_checkout input[name=authenticity_token]').attr('value');
        if (token) {
          super.authTokens.push(token);
        }
        // eslint-disable-next-line prefer-destructuring
        super.storeId = href.split('/')[3];
        // eslint-disable-next-line prefer-destructuring
        super.checkoutTokens.push(href.split('/')[5]);

        if (recaptchaFrame.length) {
          this._logger.debug('CHECKOUT: Captcha found in checkout page');
          return {
            errors: true,
            status: CheckoutErrorCodes.InvalidCaptchaToken,
          };
        }
        return { errors: null };
      }
      return { errors: true };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error proceeding to checkout');
      return { errors: true };
    }
  }

  async pollQueue() {
    super.pollQueue();
  }

  async shippingRates() {
    this._logger.verbose('CHECKOUT: Fetching shipping rates');
    const { site, profile } = this._context.task;
    const { url } = site;
    const { shipping } = profile;
    const { country, state, zipCode } = shipping;

    try {
      const res = await this._request({
        uri: `${this._task.site.url}/cart/shipping_rates.json`,
        proxy: formatProxy(this._proxy),
        followAllRedirects: true,
        rejectUnauthorized: false,
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

      const { statusCode, body } = res;
      // eslint-disable-next-line camelcase
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

      // eslint-disable-next-line camelcase
      if (body && shipping_rates) {
        shipping_rates.forEach(rate => {
          super.shippingMethods.push(rate);
        });

        const cheapest = _.min(super.shippingMethods, rate => rate.price);
        const { name } = cheapest;
        const id = `${cheapest.source}-${cheapest.name.replace('%20', ' ')}-${cheapest.price}`;
        super.chosenShippingMethod = { id, name };
        this._logger.verbose(
          'CHECKOUT: Using shipping method: %s',
          super.chosenShippingMethod.name,
        );

        // set shipping price for cart
        super.prices.shipping = cheapest.price;
        this._logger.silly('CHECKOUT: Shipping total: %s', super.prices.shipping);
        return { errors: null, rate: super.chosenShippingMethod.name };
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

  async postCustomerInformation() {
    this._logger.verbose('CHECKOUT: Submitting customer information');
    const { site, profile } = this._context.task;
    const { payment, shipping } = profile;
    const { url } = site;

    try {
      if (super.checkoutTokens.length && !super.checkoutToken) {
        super.checkoutToken = super.checkoutTokens.pop();
      }
      const res = await this._request({
        uri: `${url}/${super.storeId}/checkouts/${super.checkoutToken}`,
        method: 'post',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: true,
        resolveWithFullResponse: true,
        simple: false,
        headers: {
          Origin: `${url}`,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': userAgent,
        },
        formData: submitCustomerInformation(
          payment,
          shipping,
          super.authTokens.shift(),
          super.captchaToken,
        ),
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
      const token = $('form.edit_checkout input[name=authenticity_token]').attr('value');
      if (token) {
        super.authTokens.push(token);
      }
      return { error: null };
    } catch (err) {
      this._logger.verbose('CHECKOUT: Request error submitting customer information %j', err);
      return { error: true };
    }
  }

  async paymentGateway() {
    this._logger.verbose('CHECKOUT: Finding payment gateway');
    const { site } = this._context.task;
    const { url, apiKey } = site;
    const { item, shipping } = this._prices;
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

    // log total price of cart, maybe show this in analytics when we get that setup in the future
    total = parseFloat(item) + parseFloat(shipping);
    this._logger.silly('CHECKOUT: Cart total: %s', total);

    try {
      const res = await this._request({
        uri: `${url}/${super.storeId}/checkouts/${
          super.checkoutToken
        }?previous_step=shipping_method&step=payment_method`,
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
        super.gateway = $(".radio-wrapper.content-box__row[data-gateway-group='direct']").attr(
          'data-select-gateway',
        );
        this._logger.silly('CHECKOUT: Found payment gateway: %s', super.gateway);
        return { errors: null };
      }
      return { errors: CheckoutErrorCodes.InvalidGateway };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error fetching payment gateway: %j', err);
      return { errors: true };
    }
  }

  async postPayment() {
    this._logger.verbose('FRONTEND CHECKOUT: Handling post payment step');
    const { site } = this._task;
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

    const { id } = super.chosenShippingMethod;

    try {
      const res = await this._request({
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
          super.paymentTokens.pop(),
          super.gateway,
          id,
          super.captchaToken,
          super.prices.total,
          this._context.task.profile,
          true,
        ),
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
        this._logger.verbose('CHECKOUT: Captcha failed, retrying');
        return { errors: CheckoutErrorCodes.InvalidCaptchaToken };
      }

      if (step === ShopifyPaymentSteps.Review) {
        this._logger.verbose('CHECKOUT: Review step found, submitting');
        return { errors: CheckoutErrorCodes.Review };
      }

      if (step === ShopifyPaymentSteps.Processing) {
        this._logger.verbose('FRONTEND CHECKOUT: Processing step found, polling');
        return { errors: CheckoutErrorCodes.Processing };
      }
      return { errors: null };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error during post payment: %j', err);
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
      ...getHeaders(),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${apiKey}`,
    };

    try {
      const res = await this._request({})
    } catch (err) {
      this._logger.debug('FRONTEND CHECKOUT: Error processing payment %j', err);
      return { errors: true };
    }

  }
}
module.exports = FrontendCheckout;
