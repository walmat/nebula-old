const { States } = require('./utils/constants').TaskRunner;
const {
  waitForDelay,
  formatProxy,
  now,
  userAgent,
} = require('./utils');
const {
  buildCheckoutForm,
  buildPaymentTokenForm,
  buildPatchCartForm
} = require('./utils/forms');

class Checkout {

    /**
     * Get Checkout States for checkout module
     */
    static get States() {
        return {
            CreateCheckout: 'CREATE_CHECKOUT',
            PatchCart: 'PATCH_CART',
            GetShippingRates: 'GET_SHIPPING_RATES',
            PollQueue: 'POLL_QUEUE',
            RequestCaptcha: 'REQUEST_CAPTCHA',
            PostPayment: 'POST_PAYMENT',
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
      // MARK: All globals inside of context

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


      // MARK: All globals outside of context

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
    generatePaymentToken() {
      this._logger.verbose('Generating Payment Token.');
      return this._request({
          uri: `https://elb.deposit.shopifycs.com/sessions`,
          followAllRedirects: true,
          proxy: formatProxy(this._proxy),
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
            return body.id;
        }
        return null;
      })
      .catch((err) => {
          this._logger.debug('CHECKOUT: Error getting payment token: %s', err);
          return {
              errors: 'Failed: Getting payment tokens',
              nextState: Checkout.States.Error,
          }
      });
    }

    async _handleCreateCheckout() {
      this._logger.verbose('Generating Checkout Token.');
      return this._request({
        uri: `${this._task.site.url}/wallets/checkouts`,
        method: 'POST',
        proxy: formatProxy(this._proxy),
        simple: false,
        json: true,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        jar: this._jar,
        headers: {
          'Accept': 'application/json',
          'cache-control': 'no-store',
          'Content-Type': 'application/json',
          'Authorization': Buffer.from('08430b96c47dd2ac8e17e305db3b71e8::').toString('base64'),
          'User-Agent': userAgent,
          'host': `${this._task.site.url}`,
        },
        body: JSON.stringify(buildCheckoutForm(this._task)),
      })
      .then((res) => {
        if (res.statusCode === 303) {
            this._logger.info('Checkout queue, polling %d ms', Checkout.Delays.CheckoutQueue);
            Checkout._handlePoll(Checkout.Delays.PollCheckoutQueue, 'Waiting in checkout queue..', Checkout.States.CreateCheckout)
        } else if (res.body.checkout){
            this._logger.info('Created checkout in %d ms', this._timer.getRunTime());

            // push the checkout token to the stack
            this._checkouts.push(res.body.checkout.web_url.split('/')[5]);

            // proceed straight to checkout if setup never happened
            if (!this._setup) {
              return {
                message: 'Created checkout session',
                nextState: Checkout.States.PatchCart,
              }
            }
            // otherwise, during setup, keep creating checkout tokens.
            return {
              message: 'Created checkout session',
              nextState: Checkout.States.CreateCheckout,
            }
        } else {
          // might not ever get called, but just a failsafe
          return {
            message: 'Failed: Created checkout session',
            nextState: Checkout.States.Stopped,
          };
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

      var headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Shopify-Checkout-Version': '2016-09-06',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.84 Safari/537.36',
        'host': 'kith.com',
        'cookie': '_shopify_y=1f2261ba-cda9-4d05-a201-c530440ca585; _orig_referrer=; secure_customer_sig=; _landing_page=%2Fcollections%2Ffootwear%2Fproducts%2Fnike-air-jordan-12-retro-gym-red-black; cart_sig=; _secure_session_id=6a81c7fa821fc501b88da259028e3104',
        'authorization': 'Basic MDg0MzBiOTZjNDdkZDJhYzhlMTdlMzA1ZGIzYjcxZTg6Og=='
      };

      if (!this._checkoutTokens.isEmpty()) {
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
              jar: this._jar,
              body: JSON.stringify(buildPatchCartForm(this._task.product.variants[0])),
          })
          .then((res) => {
            console.log(res.body);
              if (res.statusCode === 202 && res.body.checkout.line_items.length > 0) {
                  return {
                      message: 'Added to cart',
                      nextState: Checkout.States.GetShippingRates,
                  }
              } else {
                  return {
                      message: 'Failed: Adding to cart, retrying...',
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
        this._timer.start(now());
        this._logger.verbose('Starting get shipping rates method');

        var headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Shopify-Checkout-Version': '2016-09-06',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.84 Safari/537.36',
          'host': 'kith.com',
          'cookie': '_shopify_y=1f2261ba-cda9-4d05-a201-c530440ca585; _orig_referrer=; secure_customer_sig=; _landing_page=%2Fcollections%2Ffootwear%2Fproducts%2Fnike-air-jordan-12-retro-gym-red-black; cart_sig=; _secure_session_id=6a81c7fa821fc501b88da259028e3104',
          'authorization': 'Basic MDg0MzBiOTZjNDdkZDJhYzhlMTdlMzA1ZGIzYjcxZTg6Og=='
        };

        console.log(`${this._task.site.url}/wallets/checkouts/${this._checkoutToken}/shipping_rates.json`);

        return this._request({
            uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}/shipping_rates.json`,
            proxy: formatProxy(this._proxy),
            followAllRedirects: true,
            method: 'get',
            headers,
        })
        .then((res) => {
            const rates = JSON.parse(res);

            if (rates && rates.shipping_rates) {
                rates.forEach((rate) => {
                    this._shippingMethods.push(rate);
                });

                const cheapest = _.min(this._shippingMethods.toArray(), (rate) => {
                    return rate.price;
                });

                this._timer.stop(now());
                this._logger.info('Got shipping method in %d ms', this._timer.getRunTime());
                this._chosenShippingMethod = `shopify-${cheapest.name.replace('%20', ' ')}-${cheapest.price}`;

                return {
                    message: `Using shipping method ${cheapest.name}`,
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
        return this._request({
            uri: `${this._task.site.url}/wallets/checkouts/${this._checkoutToken}`,
            method: 'POST',
            proxy: formatProxy(this._proxy),
            followAllRedirects: true,
            simple: false,
            json: true,
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            headers: {
                'User-Agent': userAgent,
                Host: `${this._task.site.url}`,
                'Content-Type': 'application/json',
            },
            formData: JSON.stringify(buildPaymentForm(this._paymentTokens.pop(), this._shippingMethod, this._captchaToken)),
        })
        .then((res) => {
            if (res.request.href.indexOf('payments')) {
                const errorMessage = res.payments.payment_processin_error_message;
                const status = res.payments.transactions.status;
                if (status.toUpperCase().indexOf('SUCCESS')) {
                    return {
                        message: 'Success: check email',
                        nextState: Checkout.States.Stopped,
                    }
                } else {
                    return {
                        message: `${status}: ${errorMessage}`,
                        nextState: Checkout.States.Stopped,
                    }
                }

            } else {
                return {
                    message: 'Failed: posting payment',
                    nextState: Checkout.States.Stopped,
                }
            }
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
            message: 'Stopping...',
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
            [Checkout.States.GetPaymentToken]: this._handleGetPaymentToken,
            [Checkout.States.PatchCart]: this._handlePatchCart,
            [Checkout.States.GetShippingRates]: this._handleGetShippingRates,
            [Checkout.States.RequestCaptcha]: this._handleRequestCaptcha,
            [Checkout.States.PostPayment]: this._handlePostPayment,
            [Checkout.States.Stopped]: this._handleStopped,
        }

        const handler = stateMap[currentState] || defaultHandler;
        return await handler.call(this);
    }

    async run() {
      if (this._context.aborted) {
        this._logger.info('Abort Detected, Stopping...');
        return { nextState: States.Aborted };
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
