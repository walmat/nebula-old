const phoneFormatter = require('phone-formatter');
const cheerio = require('cheerio');
const _ = require('underscore');
const { Stack } = require('../classes/stack');
const { States } = require('./utils/constants').TaskRunner;
const { waitForDelay, formatProxy, userAgent, getRandomIntInclusive, now } = require('./utils');
const { buildPaymentForm } = require('./utils/forms');

class Checkout {
  /**
   * Get Checkout States for checkout module
   */
  static get States() {
    return {
      CreateCheckout: 'CREATE_CHECKOUT',
      GeneratePaymentToken: 'GENERATE_PAYMENT_TOKEN',
      PatchCart: 'PATCH_CART',
      GetShippingRates: 'GET_SHIPPING_RATES',
      PollQueue: 'POLL_QUEUE',
      RequestCaptcha: 'REQUEST_CAPTCHA',
      PostPayment: 'POST_PAYMENT',
      ProcessPayment: 'PROCESS_PAYMENT',
      Restocks: 'RESTOCKS',
      Stopped: 'STOPPED',
      Error: 'ERROR',
    };
  }

  /**
   * Get delays for checkout module
   */
  static get Delays() {
    return {
      ProcessingPayment: 1500,
      PollShippingRates: 750,
      PollCheckoutQueue: 1000,
      Restocks: 750,
    };
  }

  static get ShopifySteps() {
    return {
      ContactInformation: 'contact_information',
      ShippingMethod: 'shipping_method',
      PaymentMethod: 'payment_method',
      Review: 'review',
    };
  }

  constructor(context) {
    /**
     * All data needed for monitor to run
     * This includes:
     * - current runner id
     * - current task
     * - current proxy
     * - request include
     * - logger for task
     * - whether or not we should abort
     * - has it been setup?
     * - payment tokens
     * - shipping methods
     * - checkout tokens
     * - both getCaptcha() & stopHarvestCaptcha() FNs
     * @type {TaskRunnerContext}
     */
    this._context = context;

    /**
     * Task ID for this task runner instance
     * @type {String}
     */
    this._id = this._context.id;

    /**
     * Task data for this task
     * @type {Task}
     */
    this._task = this._context.task;

    /**
     * Proxy to run the task with
     * @type {String}
     */
    this._proxy = this._context.proxy;

    /**
     * Request with Cookie Jar
     * @type {HTTPRequest}
     */
    this._request = this._context.request;

    /**
     * Logger Instance
     * @type {Logger}
     */
    this._logger = this._context.logger;

    /**
     * Stack of successfully created payment tokens for the runner
     */
    this._paymentTokens = new Stack();

    /**
     * Stack of shipping methods
     */
    this._shippingMethods = new Stack();

    /**
     * Stack of successfully created checkout sessions for the runner
     */
    this._checkoutTokens = new Stack();

    /**
     * Shipping method that is being used
     */
    this._chosenShippingMethod = {
      name: null,
      id: null,
    };

    /**
     * Current state of the checkout state machine
     * @type {String}
     */
    this._state = Checkout.States.PatchCart;

    /**
     * Current checkout token
     */
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

    /**
     * Current captcha token
     */
    this._captchaToken = '';
  }

  _getHeaders() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Shopify-Checkout-Version': '2016-09-06',
      'X-Shopify-Access-Token': `${this._task.site.apiKey}`,
      'User-Agent': userAgent,
      host: `${this._task.site.url.split('/')[2]}`,
      authorization: `Basic ${this._basicAuth}`,
    };
  }

  /**
   * Called 5 times at the start of the task
   * Generates a payment token using the task data provided from the task runner
   * @returns {String} payment token
   */
  async handleGeneratePaymentToken() {
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
        body: JSON.stringify(buildPaymentForm(this._task)),
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
   * Create a valid checkout token with user data
   */
  async handleCreateCheckout() {
    this._logger.verbose('CHECKOUT: Creating checkout token');

    const { site, profile } = this._task;
    const { shipping, billing, payment } = profile;

    const dataString = `{"card_source":"vault","pollingOptions":{"poll":false},"checkout":{"wallet_name":"default","secret":true,"is_upstream_button":true,"email":"${
      payment.email
    }","shipping_address":{"first_name":"${shipping.firstName}","last_name":"${
      shipping.lastName
    }","address1":"${shipping.address}","address2":"${shipping.apt}","company":null,"city":"${
      shipping.city
    }","country_code":"${shipping.country.value}","province_code":"${
      shipping.state.value
    }","phone":"${phoneFormatter.format(shipping.phone, '(NNN) NNN-NNNN')}","zip":"${
      shipping.zipCode
    }"},"billing_address":{"first_name":"${billing.firstName}","last_name":"${
      billing.lastName
    }","address1":"${billing.address}","address2":"${billing.apt}","company":null,"city":"${
      billing.city
    }","country_code":"${billing.country.value}","province_code":"${
      billing.state.value
    }","phone":"${phoneFormatter.format(billing.phone, '(NNN) NNN-NNNN')}","zip":"${
      billing.zipCode
    }"}}}`;

    const headers = {
      ...this._getHeaders(),
      'cache-control': 'no-store',
    };

    this._logger.silly('CHECKOUT: Creating checkout with %j: ', dataString);

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
        body: dataString,
      });
      const body = JSON.parse(res.body.toString());
      if (res.statusCode === 303) {
        this._logger.info(
          'CHECKOUT: Checkout queue, polling %d ms',
          Checkout.Delays.PollCheckoutQueue,
        );
        await waitForDelay(Checkout.Delays.PollCheckoutQueue);
        return { code: 303, error: null };
      }
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
      return null;
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
    const dataString = {
      checkout: {
        line_items: [
          {
            variant_id: this._task.product.variants[0],
            quantity: '1',
            properties: {}, // TODO - dsm ny/london needs hash
          },
        ],
      },
    };

    this._logger.silly('CHECKOUT: Adding to cart using: %j', dataString);

    if (!this._checkoutTokens.isEmpty() || this._checkoutToken) {
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
          headers: this._getHeaders(),
          body: dataString,
        });
        // "error" handling
        if (res.body.errors && res.body.errors.line_items) {
          const error = res.body.errors.line_items[0];
          if (error.quantity) {
            this._logger.verbose('Out of stock, running for restocks');
            await waitForDelay(Checkout.Delays.Restocks);
            return {
              message: 'Running for restocks',
              nextState: Checkout.States.PatchCart,
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
            nextState: Checkout.States.PatchCart,
          };
        }
        if (res.body.checkout && res.body.checkout.line_items.length > 0) {
          this._logger.info('Successfully added to cart');

          // update item prices
          this._prices.item = parseFloat(res.body.checkout.total_price).toFixed(2);
          return {
            message: 'Added to cart',
            nextState: Checkout.States.GetShippingRates,
          };
        }
        this._logger.verbose('CHECKOUT: ATC Error, retrying...');
        return {
          message: 'Failed: Add to cart, retrying...',
          nextState: Checkout.States.PatchCart,
        };
      } catch (err) {
        this._logger.debug('CHECKOUT: Error adding to cart %s', err);
        return {
          errors: 'Failed: Adding to cart',
          nextState: Checkout.States.Error,
        };
      }
    }
    this._logger.verbose('CHECKOUT: Invalid checkout session, stopping...');
    return {
      message: 'Failed: Invalid checkout session',
      nextState: States.Stopped,
    };
  }

  /**
   * @example
   * GET https://kith.com/wallets/checkouts/43b62a79f39872f9a0010fc9cb8967c6/shipping_rates.json
   */
  async _handleGetShippingRates() {
    this._logger.verbose('CHECKOUT: Fetching shipping rates');

    try {
      const res = await this._request({
        uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}/shipping_rates.json`,
        proxy: formatProxy(this._proxy),
        followAllRedirects: true,
        rejectUnauthorized: false,
        json: true,
        simple: false,
        method: 'get',
        headers: this._getHeaders(),
      });
      if (res && res.errors) {
        this._logger.verbose('CHECKOUT: Error getting shipping rates: %j', res.errors);
        return {
          message: 'No shipping rates available',
          nextState: Checkout.States.Stopped,
        };
      }
      if (res && res.shipping_rates) {
        res.shipping_rates.forEach(rate => {
          this._shippingMethods.push(rate);
        });

        const cheapest = _.min(this._shippingMethods.toArray(), rate => rate.price);

        this._chosenShippingMethod = {
          id: cheapest.id,
          name: cheapest.title,
        };
        this._logger.verbose(
          'CHECKOUT: Using shipping method: %s',
          this._chosenShippingMethod.name,
        );

        // set shipping price for cart
        this._prices.shipping = parseFloat(cheapest.price).toFixed(2);

        this._logger.silly('CHECKOUT: Shipping total: %s', this._prices.shipping);

        // TODO - RequestCaptcha if needed here maybe?
        return {
          message: `Payment Processing`,
          nextState: Checkout.States.PostPayment,
        };
      }
      // TODO -- limit this more maybe?
      this._logger.verbose(
        'No shipping rates available, polling %d ms',
        Checkout.Delays.PollShippingRates,
      );
      // poll queue
      return Checkout._handlePoll(
        Checkout.Delays.PollShippingRates,
        'Polling for shipping rates..',
        Checkout.States.GetShippingRates,
      );
    } catch (err) {
      this._logger.debug('CHECKOUT: Error fetching shipping method: %s', err);
      return {
        errors: 'Failed: no shipping rates available.',
        nextState: Checkout.States.Error,
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
      nextState: Checkout.States.PostPayment,
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
    const headers = {
      ...this._getHeaders(),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${this._task.site.apiKey}`,
    };

    this._prices.total = (
      parseFloat(this._prices.item) + parseFloat(this._prices.shipping)
    ).toFixed(2);

    this._logger.silly('CHECKOUT: Cart total: %s', this._prices.total);

    try {
      let $ = await this._request({
        uri: `${this._task.site.url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${
          this._paymentUrlKey
        }&step=payment_method`,
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

      if (step === Checkout.ShopifySteps.PaymentMethod) {
        // proceed with parsing the payment gateway if in API mode
        this._gateway = $(".radio-wrapper.content-box__row[data-gateway-group='direct']").attr(
          'data-select-gateway',
        );
      }

      this._logger.silly('CHECKOUT: Found payment gateway: %s', this._gateway);

      $ = await this._request({
        uri: `${this._task.site.url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${
          this._paymentUrlKey
        }`,
        method: 'post',
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        proxy: formatProxy(this._proxy),
        headers,
        formData: {
          utf8: '✓',
          _method: 'patch',
          authenticity_token: '',
          previous_step: 'payment_method',
          step: '',
          s: this._paymentTokens.pop(),
          'checkout[payment_gateway]': this._gateway,
          'checkout[remember_me]': '0',
          'checkout[total_price]': '',
          complete: '1',
          'checkout[client_details][browser_width]': getRandomIntInclusive(900, 970),
          'checkout[client_details][browser_height]': getRandomIntInclusive(600, 670),
          'checkout[client_details][javascript_enabled]': '1',
          'checkout[buyer_accepts_marketing]': '0',
          'checkout[shipping_rate][id]': this._chosenShippingMethod.id,
          button: '',
          'g-recaptcha-response': this._captchaToken,
        },
        transform: body => cheerio.load(body),
      });

      step = $('.step').attr('data-step');
      if (!step) {
        step = $('#step').attr('data-step');
      }

      this._logger.silly('CHECKOUT: 2nd request step: %s', step);

      if (step === Checkout.ShopifySteps.ContactInformation) {
        this._logger.verbose('CHECKOUT: Captcha failed, retrying');
        return {
          message: 'Waiting for captcha',
          nextState: Checkout.States.RequestCaptcha,
        };
      }

      this._logger.verbose('CHECKOUT: Proceeding to process payment');
      this._context.timer.start(now());
      return {
        message: `Payment Processing`,
        nextState: Checkout.States.ProcessPayment,
      };
    } catch (err) {
      this._logger.verbose('CHECKOUT: Failed posting payment: %s', err);
      return {
        message: 'Failed: posting payment',
        nextState: Checkout.States.Stopped,
      };
    }
  }

  async _handleProcessingPayment() {
    // timeout
    console.log(this._context.timer.getRunTime(now()));
    if (this._context.timer.getRunTime(now()) > 10000) {
      return {
        message: 'Payment processing timed out, check email',
        nextState: Checkout.States.Stopped,
      };
    }
    this._logger.silly(
      'CHECKOUT: Polling processing payment %d ms',
      Checkout.Delays.ProcessingPayment,
    );

    const headers = {
      ...this._getHeaders(),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Storefront-Access-Token': `${this._task.site.apiKey}`,
    };

    try {
      await waitForDelay(Checkout.Delays.ProcessingPayment);
      const res = await this._request({
        uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}/payments`,
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
              nextState: Checkout.States.Stopped,
            };
          }
          this._logger.verbose(
            'CHECKOUT: Payment error: %s',
            payments.payment_processing_error_message,
          );
          return {
            message: `Payment Failed: ${payments.payment_processing_error_message}`,
            nextState: Checkout.States.Stopped,
          };
        }
        if (payments.transaaction && payments.transaaction.status === 'failure') {
          this._logger.verbose('CHECKOUT: Payment error: %s', payments.transaction);
          return {
            message: `Payment Failed: Unknown error`,
            nextState: Checkout.States.Stopped,
          };
        }
        this._logger.verbose('CHECKOUT: Payment successful: %j', payments);
        return {
          message: `Successfully checked out`,
          nextState: Checkout.States.Stopped,
        };
      }
      this._logger.verbose('CHECKOUT: Processing payment');
      return {
        message: `Payment Processing`,
        nextState: Checkout.States.ProcessPayment,
      };
    } catch (err) {
      this._logger.debug('CHECKOUT: Failed processing payment: %s', err);
      return {
        message: 'Failed: processing payment',
        nextState: Checkout.States.Stopped,
      };
    }
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }
    this._logger.verbose('CHECKOUT: Handling State: %s ...', currentState);
    const stateMap = {
      [Checkout.States.CreateCheckout]: this._handleCreateCheckout,
      [Checkout.States.GeneratePaymentToken]: this._handleGeneratePaymentToken,
      [Checkout.States.GetPaymentToken]: this._handleGetPaymentToken,
      [Checkout.States.Restocks]: this._handleRestocks,
      [Checkout.States.PatchCart]: this._handlePatchCart,
      [Checkout.States.GetShippingRates]: this._handleGetShippingRates,
      [Checkout.States.RequestCaptcha]: this._handleRequestCaptcha,
      [Checkout.States.PostPayment]: this._handlePostPayment,
      [Checkout.States.ProcessPayment]: this._handleProcessingPayment,
    };

    const handler = stateMap[currentState] || defaultHandler;
    // eslint-disable-next-line no-return-await
    return await handler.call(this);
  }

  async run() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return {
        nextState: States.Aborted,
      };
    }

    const res = await this._handleStepLogic(this._state);

    if (res.nextState === Checkout.States.Error) {
      this._logger.verbose('CHECKOUT: Completed with errors: %j', res.errors);
      return {
        message: 'Failed: State error in checkout',
        nextState: States.Errored,
      };
    }
    if (res) {
      this._state = res.nextState;

      if (this._state !== Checkout.States.Stopped) {
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
      message: res.message,
      nextState: States.Stopped,
    };
  }
}
module.exports = Checkout;
