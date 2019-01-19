const cheerio = require('cheerio');
const _ = require('underscore');

const Checkout = require('../checkout');
const {
  formatProxy,
  userAgent,
  getHeaders,
  stateForStatusCode,
  now,
  waitForDelay,
} = require('../utils');
const { addToCart, submitCustomerInformation, paymentMethodForm } = require('../utils/forms');
const { CheckoutErrorCodes } = require('../utils/constants').ErrorCodes;
const { States } = require('../utils/constants').TaskRunner;
const { CheckoutTimeouts, ShopifyPaymentSteps } = require('../utils/constants').Checkout;

class FrontendCheckout extends Checkout {
  constructor(context) {
    super(context);
    this._context = context;
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
          // TODO - maybe think about looping back to monitor here? Idk...
          return { nextState: States.AddToCart };
        }
      }

      const { statusCode } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }

      if (statusCode === 404) {
        await waitForDelay(this._context.task.monitorDelay);
        return { message: 'Running for restocks', nextState: States.AddToCart };
      }

      return { message: 'Creating checkout', nextState: States.CreateCheckout };
    } catch (err) {
      this._logger.debug('CART: Request error in add to cart: %s', err);
      return { message: 'Failed: Add to cart', nextState: States.Stopped };
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
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }

      const { href } = res.request;
      if (href.indexOf('checkouts') > -1) {
        const $ = cheerio.load(res.body);
        const recaptchaFrame = $('#g-recaptcha');
        const token = $('form.edit_checkout input[name=authenticity_token]').attr('value');
        if (token) {
          this.authTokens.push(token);
        }
        // eslint-disable-next-line prefer-destructuring
        this.storeId = href.split('/')[3];
        // eslint-disable-next-line prefer-destructuring
        this.checkoutTokens.push(href.split('/')[5]);

        if (recaptchaFrame.length) {
          this._logger.debug('CHECKOUT: Captcha found in checkout page');
          return {
            message: 'Waiting for captcha',
            nextState: States.RequestCaptcha,
          };
        }
        if (this._context.task.product.variants) {
          return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
        }
        return { message: 'Monitoring for product', nextState: States.Monitor };
      }
      return { message: 'Failed: Creating checkout', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error proceeding to checkout');
      return { message: 'Failed: Creating checkout', nextState: States.Stopped };
    }
  }

  async shippingRates() {
    this._logger.verbose('CHECKOUT: Fetching shipping rates');
    const { site, profile, monitorDelay } = this._context.task;
    const { url } = site;
    const { shipping, payment } = profile;
    const { country, province, zipCode } = shipping;

    let res;
    try {
      res = await this._request({
        uri: `${url}/cart/shipping_rates.json`,
        proxy: formatProxy(this._context.proxy),
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
          'shipping_address[province]': province.value,
        },
      });

      const { statusCode, body } = res;
      // eslint-disable-next-line camelcase
      const { shipping_rates } = body;

      // extra check for carting
      if (statusCode === 422) {
        return { message: 'Country not supported', nextState: States.Stopped };
      }

      let checkStatus = stateForStatusCode(statusCode);

      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }

      if (body && body.errors) {
        this._logger.verbose('CHECKOUT: Error getting shipping rates: %j', body.errors);
        return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
      }

      // eslint-disable-next-line camelcase
      if (body && shipping_rates) {
        shipping_rates.forEach(rate => {
          this.shippingMethods.push(rate);
        });

        const cheapest = _.min(this.shippingMethods, rate => rate.price);
        const { name } = cheapest;
        const id = `${cheapest.source}-${cheapest.name.replace('%20', ' ')}-${cheapest.price}`;
        this.chosenShippingMethod = { id, name };
        this._logger.verbose('CHECKOUT: Using shipping method: %s', this.chosenShippingMethod.name);

        // set shipping price for cart
        this.prices.shipping = cheapest.price;
        this._logger.silly('CHECKOUT: Shipping total: %s', this.prices.shipping);

        // BEGIN POST CUSTOMER INFO
        try {
          res = await this._request({
            uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
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
              this.authTokens.shift(),
              this.captchaToken,
            ),
          });

          checkStatus = stateForStatusCode(res.statusCode);
          if (checkStatus) {
            return { message: checkStatus.message, nextState: checkStatus.nextState };
          }

          const $ = cheerio.load(res.body, { xmlMode: true, normalizeWhitespace: true });
          let step = $('.step').attr('data-step');
          if (!step) {
            step = $('#step').attr('data-step');
          }
          if (step === ShopifyPaymentSteps.ContactInformation) {
            return { message: 'Waiting for captcha', nextState: States.RequestCaptcha };
          }
          const token = $('form.edit_checkout input[name=authenticity_token]').attr('value');
          if (token) {
            this.authTokens.push(token);
          }
          return {
            message: `Using rate ${this.chosenShippingMethod.name}`,
            nextState: States.PaymentGateway,
          };
        } catch (err) {
          this._logger.debug('CHECKOUT: Request error submitting customer information: %j', err);
          return { message: 'Failed: Posting contact information', nextState: States.Stopped };
        }
      }
      this._logger.verbose('No shipping rates available, polling %d ms', monitorDelay);
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
    total = parseFloat(item) + parseFloat(shipping);
    this._logger.silly('CHECKOUT: Cart total: %s', total);

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${
          this.checkoutToken
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
    this._logger.verbose('FRONTEND CHECKOUT: Handling post payment step');
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
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}?previous_step=payment_method`,
        method: 'post',
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        proxy: formatProxy(this._context.proxy),
        headers,
        formData: paymentMethodForm(
          this.paymentTokens.pop(),
          this.gateway,
          id,
          this.captchaToken,
          this.prices.total,
          this._context.task.profile,
          true,
        ),
      });

      const { statusCode, body } = res;

      // check if redirected to `/processing` page
      if (res && res.request && res.request.uri) {
        if (res.request.uri.href.indexOf('processing') > -1) {
          return { message: 'Processing payment', nextState: States.PaymentProcess };
        }
      }

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
        this._logger.verbose('CHECKOUT: Captcha failed, retrying');
        return { message: 'Waiting for captcha', nextState: States.RequestCaptcha };
      }

      return { message: 'Processing payment', nextState: States.PaymentProcess };
    } catch (err) {
      this._logger.debug('CHECKOUT: Request error during post payment: %j', err);
      return { message: 'Failed: Posting payment', nextState: States.Stopped };
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
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}/processing`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        simple: false,
        json: false,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers,
      });

      const { statusCode, body } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return { message: checkStatus.message, nextState: checkStatus.nextState };
      }

      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      if ($('input[name="step"]').val() === 'processing') {
        return { message: 'Processing payment', nextState: States.PaymentProcess };
      }
      if (
        $('title')
          .text()
          .indexOf('Processing') > -1
      ) {
        return { message: 'Processing payment', nextState: States.PaymentProcess };
      }
      if ($('div.notice--error p.notice__text')) {
        if ($('div.notice--error p.notice__text') === '') {
          return { message: 'Payment failed', nextState: States.Stopped };
        }
        return {
          message: `${$('div.notice--error p.notice__text')
            .eq(0)
            .text()}`,
          nextState: States.Stopped,
        };
      }
      // TODO - find a success message or something later on
      return { message: 'Payment successful', nextState: States.Stopped };
    } catch (err) {
      this._logger.debug('FRONTEND CHECKOUT: Error processing payment %j', err);
      return { message: 'Failed: Processing payment', nextState: States.Stopped };
    }
  }
}
module.exports = FrontendCheckout;
