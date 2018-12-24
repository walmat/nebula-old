const phoneFormatter = require('phone-formatter');
const cheerio = require('cheerio');
const _ = require('underscore');
const { States } = require('./utils/constants').TaskRunner;
const { waitForDelay, formatProxy, userAgent, getRandomIntInclusive } = require('./utils');
const { buildPaymentTokenForm } = require('./utils/forms');

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
    this._jar = this._context.jar;

    /**
     * Logger Instance
     * @type {Logger}
     */
    this._logger = this._context.logger;

    /**
     * Whether this task runner has aborted
     * @type {Boolean}
     */
    this._aborted = this._context.aborted;

    /**
     * Has the task been setup yet?
     */
    this._setup = this._context.setup;

    /**
     * Payment tokens
     * @type {Stack}
     */
    this._paymentTokens = this._context.paymentTokens;

    /**
     * Shipping methods
     * @type {Stack}
     */
    this._shippingMethods = this._context.shippingMethods;

    /**
     * Checkout tokens
     * @type {Stack}
     */
    this._checkoutTokens = this._context.checkoutTokens;

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
    this._checkoutToken = '';
    this._storeId = '';
    this._paymentUrlKey = '';
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

  /**
   * Called 5 times at the start of the task
   * Generates a payment token using the task data provided from the task runner
   * @returns {String} payment token
   */
  async _handleGeneratePaymentToken() {
    this._logger.verbose('CHECKOUT: Generating Payment Token');
    return this._request({
      uri: `https://elb.deposit.shopifycs.com/sessions`,
      followAllRedirects: true,
      proxy: formatProxy(this._proxy),
      rejectUnauthorized: false,
      method: 'post',
      jar: this._jar,
      resolveWithFullResponse: true,
      headers: {
        'User-Agent': userAgent,
        'Content-Type': 'application/json',
        Connection: 'Keep-Alive',
      },
      body: JSON.stringify(buildPaymentTokenForm(this._task)),
    })
      .then(res => {
        const body = JSON.parse(res.body);
        if (body && body.id) {
          this._logger.verbose('Payment token: %s', body.id);
          this._paymentTokens.push(body.id);
          return body.id;
        }
        return null;
      })
      .catch(err => {
        this._logger.debug('CHECKOUT: Error getting payment token: %s', err);
        return null;
      });
  }

  /**
   * Create a valid checkout token with user data
   */
  async _handleCreateCheckout() {
    this._logger.verbose('CHECKOUT: Creating checkout token');

    const dataString = `{"card_source":"vault","pollingOptions":{"poll":false},"checkout":{"wallet_name":"default","secret":true,"is_upstream_button":true,"email":"${
      this._task.profile.payment.email
    }","shipping_address":{"first_name":"${this._task.profile.shipping.firstName}","last_name":"${
      this._task.profile.shipping.lastName
    }","address1":"${this._task.profile.shipping.address}","address2":"${
      this._task.profile.shipping.apt
    }","company":null,"city":"${this._task.profile.shipping.city}","country_code":"${
      this._task.profile.shipping.country.value
    }","province_code":"${
      this._task.profile.shipping.state.value
    }","phone":"${phoneFormatter.format(
      this._task.profile.shipping.phone,
      '(NNN) NNN-NNNN',
    )}","zip":"${this._task.profile.shipping.zipCode}"},"billing_address":{"first_name":"${
      this._task.profile.billing.firstName
    }","last_name":"${this._task.profile.billing.lastName}","address1":"${
      this._task.profile.billing.address
    }","address2":"${this._task.profile.billing.apt}","company":null,"city":"${
      this._task.profile.billing.city
    }","country_code":"${this._task.profile.billing.country.value}","province_code":"${
      this._task.profile.billing.state.value
    }","phone":"${phoneFormatter.format(
      this._task.profile.billing.phone,
      '(NNN) NNN-NNNN',
    )}","zip":"${this._task.profile.billing.zipCode}"}}}`;
    const headers = {
      Accept: 'application/json',
      'cache-control': 'no-store',
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
      host: `${this._task.site.url.split('/')[2]}`,
      authorization: `Basic ${this._basicAuth}`,
    };

    this._logger.silly('CHECKOUT: Creating checkout with %j: ', dataString);

    return this._request({
      uri: `${this._task.site.url}/wallets/checkouts`,
      method: 'POST',
      proxy: formatProxy(this._proxy),
      simple: false,
      json: false,
      encoding: null,
      jar: this._jar,
      rejectUnauthorized: false,
      resolveWithFullResponse: true,
      headers,
      body: dataString,
    })
      .then(async res => {
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
          this._logger.verbose(
            'CHECKOUT: Created checkout token: %s',
            body.checkout.clone_url.split('/')[5],
          );
          // eslint-disable-next-line prefer-destructuring
          this._storeId = body.checkout.clone_url.split('/')[3];
          // eslint-disable-next-line prefer-destructuring
          this._paymentUrlKey = body.checkout.web_url.split('=')[1];
          // push the checkout token to the stack
          this._checkoutTokens.push(body.checkout.clone_url.split('/')[5]);
          return { code: 200, res: body.checkout.clone_url.split('/')[5] };
        }
        // might not ever get called, but just a failsafe
        this._logger.debug('Failed: Creating checkout session %s', res);
        return null;
      })
      .catch(err => {
        this._logger.debug('CHECKOUT: Error creating checkout: %s', err);
        return { code: err.statusCode, error: err };
      });
  }

  // async _handleRestocks() {}

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

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Shopify-Checkout-Version': '2016-09-06',
      'X-Shopify-Access-Token': `${this._task.site.apiKey}`,
      'User-Agent': userAgent,
      host: `${this._task.site.url.split('/')[2]}`,
      authorization: `Basic ${this._basicAuth}`,
    };

    if (!this._checkoutTokens.isEmpty()) {
      this._logger.verbose('CHECKOUT: Adding to cart');
      this._checkoutToken = this._checkoutTokens.pop();
      return this._request({
        uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}.json`,
        method: 'PATCH',
        proxy: formatProxy(this._proxy),
        simple: false,
        json: true,
        jar: this._jar,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers,
        body: dataString,
      })
        .then(async res => {
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
        })
        .catch(err => {
          this._logger.debug('CHECKOUT: Error adding to cart %s', err);
          return {
            errors: 'Failed: Adding to cart',
            nextState: Checkout.States.Error,
          };
        });
    }
    this._logger.verbose('CHECKOUT: ATC Error, stopping...');
    return {
      message: 'Failed: Add to cart, stopping...',
      nextState: States.Stopped,
    };
  }

  /**
   * @example
   * GET https://kith.com/wallets/checkouts/43b62a79f39872f9a0010fc9cb8967c6/shipping_rates.json
   */
  async _handleGetShippingRates() {
    this._logger.verbose('CHECKOUT: Fetching shipping rates');

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Shopify-Checkout-Version': '2016-09-06',
      'X-Shopify-Access-Token': `${this._task.site.apiKey}`,
      'User-Agent': userAgent,
      host: `${this._task.site.url.split('/')[2]}`,
      authorization: `Basic ${this._basicAuth}`,
    };

    return this._request({
      uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}/shipping_rates.json`,
      proxy: formatProxy(this._proxy),
      followAllRedirects: true,
      rejectUnauthorized: false,
      jar: this._jar,
      json: true,
      simple: false,
      method: 'get',
      headers,
    })
      .then(res => {
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
      })
      .catch(err => {
        this._logger.debug('CHECKOUT: Error fetching shipping method: %s', err);
        return {
          errors: 'Failed: no shipping rates available.',
          nextState: Checkout.States.Error,
        };
      });
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
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Checkout-Version': '2016-09-06',
      'X-Shopify-Storefront-Access-Token': `${this._task.site.apiKey}`,
      'User-Agent': userAgent,
      host: `${this._task.site.url.split('/')[2]}`,
    };

    this._prices.total = (
      parseFloat(this._prices.item) + parseFloat(this._prices.shipping)
    ).toFixed(2);

    this._logger.silly('CHECKOUT: Cart total: %s', this._prices.total);

    return this._request({
      uri: `${this._task.site.url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${
        this._paymentUrlKey
      }&step=payment_method`,
      method: 'get',
      followAllRedirects: true,
      resolveWithFullResponse: true,
      rejectUnauthorized: false,
      jar: this._jar,
      proxy: formatProxy(this._proxy),
      headers,
      transform: body => cheerio.load(body),
    }).then($ => {
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

      return this._request({
        uri: `${this._task.site.url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${
          this._paymentUrlKey
        }`,
        method: 'post',
        followAllRedirects: true,
        resolveWithFullResponse: true,
        rejectUnauthorized: false,
        jar: this._jar,
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
      }).then(async $ => {
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
        return {
          message: `Payment Processing`,
          nextState: Checkout.States.ProcessPayment,
        };
      });
    });
  }

  // TODO - timeout this maybe?
  async _handleProcessingPayment() {
    this._logger.silly(
      'CHECKOUT: Polling processing payment %d ms',
      Checkout.Delays.ProcessingPayment,
    );
    await waitForDelay(Checkout.Delays.ProcessingPayment);

    const headers = {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      Connection: 'Keep-Alive',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Checkout-Version': '2016-09-06',
      'X-Shopify-Storefront-Access-Token': `${this._task.site.apiKey}`,
      'User-Agent': userAgent,
      host: `${this._task.site.url.split('/')[2]}`,
    };

    return this._request({
      uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}/payments`,
      method: 'GET',
      proxy: formatProxy(this._proxy),
      simple: false,
      json: true,
      jar: this._jar,
      rejectUnauthorized: false,
      resolveWithFullResponse: true,
      headers,
    }).then(res => {
      const { body } = res;
      this._logger.verbose('CHECKOUT: Payments: %j', body);
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
        this._logger.verbose('CHECKOUT: Payment successful: %j', JSON.stringify(payments, null, 2));
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
    });
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
