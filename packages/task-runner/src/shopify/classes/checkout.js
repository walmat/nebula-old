const phoneFormatter = require('phone-formatter');
const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const {
  States
} = require('./utils/constants').TaskRunner;
const {
  waitForDelay,
  formatProxy,
  userAgent,
} = require('./utils');
const {
  buildPaymentTokenForm,
} = require('./utils/forms');

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
      Restock: 'RESTOCK',
      Stopped: 'STOPPED',
      Error: 'ERROR',
    };
  }

  /**
   * Get delays for checkout module
   */
  static get Delays() {
    return {
      PollShippingRates: 750,
      PollCheckoutQueue: 500,
    }
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
    this._chosenShippingMethod = null;

    /**
     * Current state of the checkout state machine
     * @type {String}
     */
    this._state = Checkout.States.PatchCart;

    /**
     * Current checkout token
     */
    this._checkoutToken;
    this._storeId;
    this._paymentUrlKey;
    this._basicAuth = Buffer.from(`${this._task.site.apiKey}::`).toString('base64');

    /**
     * Current captcha token
     */
    this._captchaToken;
  }

  static _handlePoll(delay, message, nextState) {
    waitForDelay(delay);
    return {
      message: message,
      nextState: nextState,
    };
  }

  /**
   * Called 5 times at the start of the task
   * Generates a payment token using the task data provided from the task runner
   * @returns {String} payment token
   */
  async _handleGeneratePaymentToken() {
    this._logger.verbose('Generating Payment Token.');
    return this._request({
        uri: `https://elb.deposit.shopifycs.com/sessions`,
        followAllRedirects: true,
        proxy: formatProxy(this._proxy),
        rejectUnauthorized: false,
        method: 'post',
        resolveWithFullResponse: true,
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
          'Connection': 'Keep-Alive',
        },
        jar: this._jar,
        body: JSON.stringify(buildPaymentTokenForm(this._task)),
      })
      .then((res) => {
        const body = JSON.parse(res.body);
        if (body && body.id) {
          this._logger.verbose('Payment token: %s', body.id);
          this._paymentTokens.push(body.id);
          return body.id;
        }
        return null;
      })
      .catch((err) => {
        this._logger.debug('CHECKOUT: Error getting payment token: %s', err);
        return null;
      });
  }

  /**
   * Create a valid checkout token with user data
   */
  async _handleCreateCheckout() {
    this._logger.verbose('Creating checkout token.');

    const dataString = `{"card_source":"vault","pollingOptions":{"poll":false},"checkout":{"wallet_name":"default","secret":true,"is_upstream_button":true,"email":"${this._task.profile.payment.email}","shipping_address":{"first_name":"${this._task.profile.shipping.firstName}","last_name":"${this._task.profile.shipping.lastName}","address1":"${this._task.profile.shipping.address}","address2":"${this._task.profile.shipping.apt}","company":null,"city":"${this._task.profile.shipping.city}","country_code":"${this._task.profile.shipping.country.value}","province_code":"${this._task.profile.shipping.state.value}","phone":"${phoneFormatter.format(this._task.profile.shipping.phone,'(NNN) NNN-NNNN')}","zip":"${this._task.profile.shipping.zipCode}"},"billing_address":{"first_name":"${this._task.profile.billing.firstName}","last_name":"${this._task.profile.billing.lastName}","address1":"${this._task.profile.billing.address}","address2":"${this._task.profile.billing.apt}","company":null,"city":"${this._task.profile.billing.city}","country_code":"${this._task.profile.billing.country.value}","province_code":"${this._task.profile.billing.state.value}","phone":"${phoneFormatter.format(this._task.profile.billing.phone,'(NNN) NNN-NNNN')}","zip":"${this._task.profile.billing.zipCode}"}}}`;
    const headers = {
      'Accept': 'application/json',
      'cache-control': 'no-store',
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
      'host': `${this._task.site.url.split('/')[2]}`,
      'authorization': `Basic ${this._basicAuth}`
    };

    return this._request({
        uri: `${this._task.site.url}/wallets/checkouts`,
        method: 'POST',
        proxy: formatProxy(this._proxy),
        simple: false,
        json: false,
        encoding: null,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers,
        body: dataString,
      })
      .then((res) => {
        const body = JSON.parse(res.body.toString());
        if (res.statusCode === 303) {
          this._logger.info('Checkout queue, polling %d ms', Checkout.Delays.CheckoutQueue);
          /**
           * During large sales or other events when many checkouts are being created
           * in a short period of time, actions that create checkout resources can be
           * throttled. When this happens, you'll receive an HTTP 303 See Other response
           * code and a Location header (which includes a URL that you can use to poll
           * the resource). To view the status of a throttled checkout, perform a GET
           * request on the URL provided in the Location header, and refer to the polling
           * guidelines above. After the queue has been processed, you'll receive a
           * payload indicating that processing is complete.
           */
          return null;
        } else if (body.checkout) {
          // push the checkout token to the stack
          this._logger.info('Created checkout token: %s', body.checkout.clone_url.split('/')[5]);
          this._storeId = body.checkout.clone_url.split('/')[3];
          this._paymentUrlKey = body.checkout.web_url.split('=')[1];
          this._checkoutTokens.push(body.checkout.clone_url.split('/')[5]);
          return body.checkout.clone_url.split('/')[5];
        } else {
          // might not ever get called, but just a failsafe
          this._logger.debug('Failed: Creating checkout session %s', res);
          return null;
        }
      })
      .catch((err) => {
        this._logger.debug('CHECKOUT: Error creating checkout: %s', err);
        return {
          errors: 'Failed: Creating checkout session',
          nextState: Checkout.States.Error,
        }
      });
  }

  /**
   * @example
   * PATCH https://kith.com/wallets/checkouts/43b62a79f39872f9a0010fc9cb8967c6.json
   * payload: {"checkout":{"line_items":[{"variant_id":17402579058757,"quantity":"1","properties":{"MVZtkB3gY9f5SnYz":"nky2UHRAKKeTk8W8"}}]}}
   */
  async _handlePatchCart() {
    const dataString = {
      "checkout": {
        "line_items": [{
          "variant_id": this._task.product.variants[0],
          "quantity": "1",
          "properties": {} // TODO - dsm ny/london needs hash
        }]
      }
    };
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Shopify-Checkout-Version': '2016-09-06',
      'X-Shopify-Access-Token': `${this._task.site.apiKey}`,
      'User-Agent': userAgent,
      'host': `${this._task.site.url.split('/')[2]}`,
      'authorization': `Basic ${this._basicAuth}`
    };

    if (!this._checkoutTokens.isEmpty()) {
      this._logger.verbose('Adding to cart.');
      this._checkoutToken = this._checkoutTokens.pop();
      return this._request({
          uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}.json`,
          method: 'PATCH',
          proxy: formatProxy(this._proxy),
          simple: false,
          json: true,
          rejectUnauthorized: false,
          resolveWithFullResponse: true,
          headers,
          body: dataString,
        })
        .then((res) => {
          // error handling
          if (res.body.errors && res.body.errors.line_items) {
            const error = res.body.errors.line_items[0];
            console.log(error);
            if (error.quantity) {
              this._logger.info('Out of stock, running for restocks');
              return { // TODO - implement this bitch again
                message: 'Running for restocks',
                nextState: Checkout.States.Restock,
              }
            } else if (error.variant_id) {
              this._logger.info('Wrong size type specified, stopping..');
              return {
                message: 'Failed: Invalid size',
                nextState: Checkout.States.Stopped,
              }
            } else {
              this._logger.info('');
              return {
                message: `Failed: ${error}`,
                nextState: Checkout.States.Stopped,
              }
            }
            // otherwise, check to see if line_items was updated
          } else if (res.body.checkout && res.body.checkout.line_items.length > 0) {
            this._logger.info('Added to cart.');
            return {
              message: 'Added to cart',
              nextState: Checkout.States.GetShippingRates,
            }
          } else {
            this._logger.debug('Failed: Adding to cart, retrying...');
            return {
              message: 'Failed: Add to cart, retrying...',
              nextState: Checkout.States.PatchCart,
            }
          }
        })
        .catch((err) => {
          this._logger.debug('CHECKOUT: Error adding to cart %s', err);
          return {
            errors: 'Failed: Adding to cart',
            nextState: Checkout.States.Error,
          }
        });
    } else {
      this._logger.verbose('Creating checkout token.');

      // we're out of valid checkout session OR we need to create one due to task setup later flag
      return {
        message: 'Creating checkout session',
        nextState: States.CreateCheckout,
      }
    }
  }

  /**
   * @example
   * GET https://kith.com/wallets/checkouts/43b62a79f39872f9a0010fc9cb8967c6/shipping_rates.json
   */
  async _handleGetShippingRates() {
    this._logger.verbose('Getting shipping rates');

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Shopify-Checkout-Version': '2016-09-06',
      'X-Shopify-Access-Token': `${this._task.site.apiKey}`,
      'User-Agent': userAgent,
      'host': `${this._task.site.url.split('/')[2]}`,
      'authorization': `Basic ${this._basicAuth}`
    };

    return this._request({
        uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}/shipping_rates.json`,
        proxy: formatProxy(this._proxy),
        followAllRedirects: true,
        rejectUnauthorized: false,
        json: true,
        method: 'get',
        headers,
      })
      .then((res) => {
        if (res && res.shipping_rates) {
          res.shipping_rates.forEach((rate) => {
            this._shippingMethods.push(rate);
          });

          const cheapest = _.min(this._shippingMethods.toArray(), (rate) => {
            return rate.price;
          });

          this._chosenShippingMethod = { id: cheapest.id, name: cheapest.title };
          this._logger.info('Got shipping method in %s', this._chosenShippingMethod);

          return {
            message: `Submitting payment`,
            nextState: Checkout.States.PostPayment,
          }
        } else {
          // TODO -- limit this more maybe?
          this._logger.info('No shipping rates available, polling %d ms', Checkout.Delays.PollShippingRates);
          // poll queue
          return Checkout._handlePoll(Checkout.Delays.PollShippingRates, 'Polling for shipping rates..', Checkout.States.GetShippingRates);
        }
      })
      .catch((err) => {
        this._logger.debug('CART: Error getting shipping method: %s', err);
        return {
          errors: 'Failed: Getting shipping rates',
          nextState: Checkout.States.Error,
        }
      });
  }

  /**
   * Handle CAPTCHA requests
   */
  async _handleRequestCaptcha() {
    this._logger.verbose('CHECKOUT: Getting Solved Captcha...');
    const token = await this._context.getCaptcha();
    if (token) {
      this._logger.debug('CHECKOUT: Received token from captcha harvesting: %s', token);
      this._captchaToken = token;
    }
    return {
      message: 'Submitting payment',
      nextState: Checkout.States.PostPayment,
    }
  }

  /**
   * @example
   *
   */
  async _handlePostPayment() {
    this._logger.verbose('Posting payment.');
    const headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      'Content-Type': 'multipart/form-data;',
      'Upgrade-Insecure-Requests': '1',
      'X-Shopify-Checkout-Version': '2016-09-06',
      'X-Shopify-Storefront-Access-Token': `${this._task.site.apiKey}`,
      'User-Agent': userAgent,
      'host': `${this._task.site.url.split('/')[2]}`,
    };

    return this._request({
        uri:  `${this._task.site.url}/${this._storeId}/checkouts/${this._checkoutToken}?key=${this._paymentUrlKey}`,
        method: 'POST',
        proxy: formatProxy(this._proxy),
        followAllRedirects: true,
        simple: false,
        json: false,
        encoding: null,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        headers,
        formData: {
          'utf8': '✓',
          '_method': 'patch',
          'authenticity_token': '',
          'previous_step': 'shipping_method',
          'step': 'payment_method',
          's': this._paymentTokens.pop(),
          'checkout[remember_me]': 0,
          'checkout[total_price]': '',
          'complete': 1,
          'checkout[client_details][browser_width]': '979',
          'checkout[client_details][browser_height]': '631',
          'checkout[client_details][javascript_enabled]': '1',
          'checkout[buyer_accepts_marketing]': '0',
          'checkout[shipping_rate][id]': this._chosenShippingMethod.id,
          'button': '',
        },
      })
      .then((res) => {
        fs.writeFileSync(path.join(__dirname, 'payment-1.html'), res.body);

        const headers = {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
          'Connection': 'Keep-Alive',
          'Content-Type': 'multipart/form-data;',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Checkout-Version': '2016-09-06',
          'X-Shopify-Storefront-Access-Token': `${this._task.site.apiKey}`,
          'User-Agent': userAgent,
          'host': `${this._task.site.url.split('/')[2]}`,
        };

        return this._request({
          uri: `${this._task.site.url}/${this._storeId}/checkouts/${this._checkoutToken}`,
          method: 'POST',
          proxy: formatProxy(this._proxy),
          followAllRedirects: true,
          simple: false,
          json: false,
          rejectUnauthorized: false,
          resolveWithFullResponse: true,
          headers,
          formData: {
            'utf8': '✓',
            '_method': 'patch',
            'authenticity_token': '',
            'checkout[total_price]': '',
            'complete': 1,
            'button': '',
            'checkout[client_details][browser_width]': '979',
            'checkout[client_details][browser_height]': '631',
            'checkout[client_details][javascript_enabled]': '1',
          },
        })
        .then((res) => {
          console.log(res.statusCode);
          fs.writeFileSync(path.join(__dirname, 'payment-2.html'), res.body);
          const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Shopify-Checkout-Version': '2016-09-06',
            'X-Shopify-Storefront-Access-Token': `${this._task.site.apiKey}`,
            'User-Agent': userAgent,
            'host': `${this._task.site.url.split('/')[2]}`,
            'authorization': `Basic ${this._basicAuth}`
          };

          return this._request({
            uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}/payments`,
            method: 'GET',
            proxy: formatProxy(this._proxy),
            simple: false,
            json: true,
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            headers,
          })
          .then((res) => {
            fs.writeFileSync(path.join(__dirname, 'payment-3.html'), JSON.stringify(res.body, null, 2));
            return {
              message: 'Payment failed.',
              nextState: Checkout.States.Stopped,
            };
          });
        });
      })
      .catch((err) => {
        this._logger.debug('CHECKOUT: Error posting payment %s', err);
        return {
          errors: err,
          nextState: Checkout.States.Error,
        }
      })
  }

  async _handleStopped() {
    return {
      message: 'Stopping task',
      nextState: Checkout.States.Stopped,
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
      [Checkout.States.PatchCart]: this._handlePatchCart,
      [Checkout.States.GetShippingRates]: this._handleGetShippingRates,
      [Checkout.States.RequestCaptcha]: this._handleRequestCaptcha,
      [Checkout.States.PostPayment]: this._handlePostPayment,
    }

    const handler = stateMap[currentState] || defaultHandler;
    return await handler.call(this);
  }

  async run() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return {
        nextState: States.Aborted
      };
    }

    const res = await this._handleStepLogic(this._state);

    if (res.nextState === Checkout.States.Error) {
      this._logger.verbose('CHECKOUT: Completed with errors: %j', res.errors);
      return {
        message: 'Failed: State error in checkout',
        nextState: States.Errored,
      }
    } else if (res) {
      this._state = res.nextState;

      if (this._state !== Checkout.States.Stopped) {
        return {
          message: res.message,
          nextState: States.Checkout,
        }
      } else {
        return {
          message: res.message,
          nextState: States.Stopped,
        }
      }
    } else {
      return {
        message: res.message,
        nextState: States.Stopped,
      }
    }
  }
}
module.exports = Checkout;
