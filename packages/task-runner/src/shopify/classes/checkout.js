/* eslint-disable class-methods-use-this */
/* eslint-disable camelcase */
const cheerio = require('cheerio');
const _ = require('underscore');
const { States } = require('./utils/constants').TaskRunner;
const { waitForDelay, formatProxy, userAgent, now } = require('./utils');
const {
  buildPaymentForm,
  createCheckoutForm,
  patchToCart,
  paymentMethodForm,
  paymentReviewForm,
} = require('./utils/forms');
const {
  CheckoutStates,
  CheckoutTimeouts,
  Delays,
  ShopifyPaymentSteps,
} = require('../classes/utils/constants').Checkout;

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

    this._state = CheckoutStates.PatchCart;
    this._previousState = null;

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
    const { url } = site;
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Shopify-Checkout-Version': '2016-09-06',
      'X-Shopify-Access-Token': `${site.apiKey}`,
      'User-Agent': userAgent,
      host: `${url.split('/')[2]}`,
      authorization: `Basic ${this._basicAuth}`,
    };
  }

  isBanned(statusCode) {
    return !!(statusCode === 403 || statusCode === 429 || statusCode === 430);
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
   * Handles waiting in a checkout queue for Shopify
   * @returns {}
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
      if (this.isBanned(statusCode)) {
        return {
          error: true,
          status: statusCode,
        };
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

  /**
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

  /**
   * @example
   * PATCH https://kith.com/wallets/checkouts/43b62a79f39872f9a0010fc9cb8967c6.json
   * payload: {"checkout":{"line_items":[{"variant_id":17402579058757,"quantity":"1","properties":{"MVZtkB3gY9f5SnYz":"nky2UHRAKKeTk8W8"}}]}}
   */
  async _handlePatchCart() {
    const { site, product, monitorDelay } = this._task;

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
        // "error" handling
        if (res.body.errors && res.body.errors.line_items[0].variant_id) {
          const error = res.body.errors.line_items[0];
          this._logger.verbose('Error with adding to cart: %j', error);
          if (error.quantity) {
            this._logger.verbose('Out of stock, running for restocks');
            // TODO – infinite loop here somehow...
            await waitForDelay(monitorDelay);
            return {
              message: 'Running for restocks',
              nextState: CheckoutStates.PatchCart,
            };
          }
          if (error.variant_id && error.variant_id[0]) {
            this._logger.verbose('Invalid size option passed to task');
            return {
              message: 'Failed: Invalid size',
              nextState: States.Stopped,
            };
          }
          this._logger.verbose('CHECKOUT: Generic error in ATC: %j', error);
          return {
            message: `Failed: ATC Error, retrying...`,
            nextState: CheckoutStates.PatchCart,
          };
        }
        if (res.body.checkout && res.body.checkout.line_items.length > 0) {
          this._logger.info('Successfully added to cart');
          const { total_price } = res.body.checkout;
          this._prices.item = parseFloat(total_price).toFixed(2);

          return {
            message: 'Added to cart',
            nextState: CheckoutStates.GetShippingRates,
          };
        }
        this._logger.verbose('CHECKOUT: ATC Error, retrying...');
        return {
          message: 'Failed: Add to cart, retrying...',
          nextState: CheckoutStates.PatchCart,
        };
      } catch (err) {
        this._logger.debug('CHECKOUT: Error adding to cart %s', err);
        return {
          message: 'Failed: Adding to cart',
          nextState: States.Errored,
        };
      }
    }
    this._logger.verbose('CHECKOUT: Invalid checkout session, stopping...');
    return {
      message: 'Failed: Error creating checkout session',
      nextState: States.Stopped,
    };
  }

  /**
   * @example
   * GET https://kith.com/wallets/checkouts/43b62a79f39872f9a0010fc9cb8967c6/shipping_rates.json
   */
  async _handleGetShippingRates() {
    this._logger.verbose('CHECKOUT: Fetching shipping rates');
    const { site } = this._task;

    try {
      const res = await this._request({
        uri: `${site.url}/wallets/checkouts/${this._checkoutToken}/shipping_rates.json`,
        proxy: formatProxy(this._proxy),
        followAllRedirects: true,
        rejectUnauthorized: false,
        json: true,
        simple: false,
        method: 'get',
        headers: this._headers(),
      });
      if (res && res.errors) {
        const { errors } = res;
        this._logger.verbose('CHECKOUT: Error getting shipping rates: %j', errors);
        return {
          message: 'No shipping rates available',
          nextState: States.Stopped,
        };
      }
      if (res && res.shipping_rates) {
        const { shipping_rates } = res;
        shipping_rates.forEach(rate => {
          this._shippingMethods.push(rate);
        });

        const cheapest = _.min(this._shippingMethods, rate => rate.price);
        const { id, title } = cheapest;
        this._chosenShippingMethod = {
          id,
          name: title,
        };
        this._logger.verbose(
          'CHECKOUT: Using shipping method: %s',
          this._chosenShippingMethod.name,
        );

        // set shipping price for cart
        let { shipping } = this._prices;
        shipping = parseFloat(cheapest.price).toFixed(2);
        this._logger.silly('CHECKOUT: Shipping total: %s', shipping);

        return {
          message: `Payment Processing`,
          nextState: CheckoutStates.PostPayment,
        };
      }
      this._logger.verbose('No shipping rates available, polling %d ms', Delays.PollShippingRates);
      // TODO - FIX INFINITE LOOP HERE
      await waitForDelay(Delays.PollShippingRates);
      return {
        message: 'Polling for shipping rates..',
        nextState: CheckoutStates.GetShippingRates,
      };
    } catch (err) {
      this._logger.debug('CHECKOUT: Error fetching shipping method: %s', err);
      return {
        errors: 'Failed: unable to fetch shipping rates',
        nextState: States.Errored,
      };
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
    }
    return {
      message: 'Submitting payment',
      nextState: CheckoutStates.PostPayment,
    };
  }

  /**
   * @example
   * Steps (API):
   * 1. GET `https://blendsus.com/1529745/checkouts/6eb86de0a19e7d50ec27859a7d43a0e8?previous_step=shipping_method&step=payment_method`
   * 2. POST `https://blendsus.com/1529745/checkouts/6eb86de0a19e7d50ec27859a7d43a0e8`
   * 3. POST `https://blendsus.com/1529745/checkouts/6eb86de0a19e7d50ec27859a7d43a0e8`
   * 4. GET `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}/payments`
   */
  async _handlePostPayment() {
    this._logger.verbose('CHECKOUT: Posting payment');
    const { site } = this._task;
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
      'X-Shopify-Storefront-Access-Token': `${site.apiKey}`,
    };

    // log total price of cart, maybe show this in analytics when we get that setup in the future
    total = (parseFloat(item) + parseFloat(shipping)).toFixed(2);
    this._logger.silly('CHECKOUT: Cart total: %s', total);

    try {
      let $ = await this._request({
        uri: `${site.url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${
          this._paymentUrlKey
        }&previous_step=shipping_method&step=payment_method`,
        method: 'get',
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        proxy: formatProxy(this._proxy),
        headers,
        transform: body => cheerio.load(body),
      });
      let step = $('.step').attr('data-step');
      if (!step) {
        step = $('#step').attr('data-step');
      }

      this._logger.silly('CHECKOUT: 1st request step: %s', step);

      if (step === ShopifyPaymentSteps.PaymentMethod) {
        this._gateway = $(".radio-wrapper.content-box__row[data-gateway-group='direct']").attr(
          'data-select-gateway',
        );
      }

      this._logger.silly('CHECKOUT: Found payment gateway: %s', this._gateway);
      const { id } = this._chosenShippingMethod;
      $ = await this._request({
        uri: `${site.url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${
          this._paymentUrlKey
        }`,
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
        transform: body => cheerio.load(body),
      });

      step = $('.step').attr('data-step');
      if (!step) {
        step = $('#step').attr('data-step');
      }

      this._logger.silly('CHECKOUT: 2nd request step: %s', step);

      if (step === ShopifyPaymentSteps.ContactInformation) {
        this._logger.verbose('CHECKOUT: Captcha failed, retrying');
        return {
          message: 'Waiting for captcha',
          nextState: CheckoutStates.RequestCaptcha,
        };
      }

      if (step === ShopifyPaymentSteps.Review) {
        await this._request({
          uri: `${site.url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${
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
      }

      this._logger.verbose('CHECKOUT: Proceeding to process payment');
      this._context.timer.start(now());
      return {
        message: `Payment Processing`,
        nextState: CheckoutStates.ProcessPayment,
      };
    } catch (err) {
      this._logger.verbose('CHECKOUT: Failed posting payment: %s', err);
      return {
        message: 'Failed: posting payment',
        nextState: States.Stopped,
      };
    }
  }

  async _handleProcessingPayment() {
    const { timer } = this._context;
    const { site } = this._task;
    if (timer.getRunTime(now()) > CheckoutTimeouts.ProcessingPayment) {
      return {
        message: 'Payment processing timed out, check email',
        nextState: States.Stopped,
      };
    }
    this._logger.silly('CHECKOUT: Polling processing payment %d ms', Delays.ProcessingPayment);

    const headers = {
      ...this._headers(),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${site.apiKey}`,
    };

    try {
      await waitForDelay(Delays.ProcessingPayment);
      const res = await this._request({
        uri: `${site.url}/wallets/checkouts/${this._checkoutToken}/payments`,
        method: 'GET',
        proxy: formatProxy(this._proxy),
        simple: false,
        json: true,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers,
      });
      const { body } = res;
      this._logger.verbose('CHECKOUT: Payments object: %j', body);
      const payments = body.payments[0];
      if (body && payments) {
        if (payments.payment_processing_error_message) {
          if (payments.payment_processing_error_message.toUpperCase().indexOf('NO MATCH') > -1) {
            return {
              message: `Payment Failed: Payment error`,
              nextState: States.Stopped,
            };
          }
          this._logger.verbose(
            'CHECKOUT: Payment error: %s',
            payments.payment_processing_error_message,
          );
          return {
            message: `Payment Failed: ${payments.payment_processing_error_message}`,
            nextState: States.Stopped,
          };
        }
        if (payments.transaction && payments.transaction.status === 'failure') {
          const { transaction } = payments;
          this._logger.verbose('CHECKOUT: Payment error: %s', transaction);
          return {
            message: `Payment Failed: Unknown error`,
            nextState: States.Stopped,
          };
        }
        this._logger.verbose('CHECKOUT: Payment successful: %j', payments);
        return {
          message: `Successfully checked out`,
          nextState: States.Stopped,
        };
      }
      this._logger.verbose('CHECKOUT: Processing payment');
      return {
        message: `Payment Processing`,
        nextState: States.ProcessPayment,
      };
    } catch (err) {
      this._logger.debug('CHECKOUT: Failed processing payment: %s', err);
      return {
        message: 'Failed: processing payment',
        nextState: States.Stopped,
      };
    }
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }
    this._logger.verbose('CHECKOUT: Handling State: %s ...', currentState);
    const stateMap = {
      [CheckoutStates.CreateCheckout]: this._handleCreateCheckout,
      [CheckoutStates.GeneratePaymentToken]: this._handleGeneratePaymentToken,
      [CheckoutStates.GetPaymentToken]: this._handleGetPaymentToken,
      [CheckoutStates.Restocks]: this._handleRestocks,
      [CheckoutStates.PatchCart]: this._handlePatchCart,
      [CheckoutStates.GetShippingRates]: this._handleGetShippingRates,
      [CheckoutStates.RequestCaptcha]: this._handleRequestCaptcha,
      [CheckoutStates.PostPayment]: this._handlePostPayment,
      [CheckoutStates.ProcessPayment]: this._handleProcessingPayment,
    };

    const handler = stateMap[currentState] || defaultHandler;
    // eslint-disable-next-line no-return-await
    return await handler.call(this);
  }

  /**
   * Used to run the checkout process
   * Starts from: `Checkout.States.PatchCart`
   */
  async run() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return { nextState: States.Aborted };
    }

    /**
     * MARK : State machine for checkout process
     * 1. `PATCH CART`
     * 2. `GET SHIPPING RATES`
     * 3. `POST PAYMENT`
     * 4. `REQUEST CAPTCHA` (not always needed)
     * 5. `PROCESS PAYMENT`
     */
    this._logger.verbose(
      'CHECKOUT: Finished state: %s ...',
      this._previousState ? this._previousState : CheckoutStates.PatchCart,
    );
    const res = await this._handleStepLogic(this._state);

    if (res) {
      this._previousState = this._state;
      this._state = res.nextState;

      if (this._state === States.Errored) {
        // TODO - go back to previous step if possible
        // or handle this in some way
        return {
          message: res.message,
          nextState: States.Stopped,
        };
      }

      if (this._state !== States.Stopped) {
        return {
          message: res.message,
          nextState: States.Checkout,
        };
      }
      return {
        message: res.message,
        nextState: States.Stopped,
      };
    }
    return {
      message: 'Invalid state in checkout, stopping',
      nextState: States.Stopped,
    };
  }
}
module.exports = Checkout;
