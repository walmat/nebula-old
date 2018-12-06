const Timer = require('./timer');
const { States } = require('./utils/constants').TaskRunner;
const {
    waitForDelay,
    formatProxy,
    now,
    userAgent,
    formatter,
} = require('./utils');
const { buildCheckoutForm, buildShippingRatesForm, buildPaymentTokenForm } = require('./utils/forms');

class Checkout {

    /**
     * Checkout States
     */
    static get States() {
        return {
            CreateCheckout: 'CREATE_CHECKOUT',
            PatchCart: 'PATCH_CART',
            GetShippingRates: 'GET_SHIPPING_RATES',
            PollQueue: 'POLL_QUEUE',
            RequestCaptcha: 'REQUEST_CAPTCHA',
            SubmitPayment: 'SUBMIT_PAYMENT',
        };
    }

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
         * - whether or not we should abort
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
         * Request with Cookie Jar
         * @type {HTTPRequest}
         */
        this._request = this._context.request;

        /**
         * Proxy to run the task with
         * @type {String}
         */
        this._proxy = this._context.proxy;

        /**
         * Whether this task runner has aborted
         * @type {Boolean}
         */
        this._aborted = this._context.aborted;

        /**
         * Logger Instance
         * @type {Logger}
         */
        this._logger = this._context.logger;

        /**
         * Current state of the checkout state machine
         * @type {String}
         */
        this._state = Checkout.States.PatchCart;

        /**
         * Timer for the entire checkout process and it's sub-models
         * @type {Timer}
         */
        this._timer = new Timer();
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
        this._timer.start(now());
        this._logger.verbose('Getting Payment Token.');
        return this._request({
            uri: `https://elb.deposit.shopifycs.com/sessions`,
            followAllRedirects: true,
            proxy: formatProxy(this._proxy),
            method: 'post',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildPaymentTokenForm(this._task)),
        })
        .then((res) => {
            this._timer.stop(now());
            this._logger.info('Got payment token in %d ms', this._timer.getRunTime());
            const body = JSON.parse(res);
            if (body && body.id) { 
                // MARK: set payment token
                this._logger.verbose('Payment token: %s', body.id);
                return body.id;
            }
            return null;
        })
        .catch((err) => {
            this._logger.debug('CHECKOUT: Error getting payment token: %s', err);
            return {
                errors: err,
            }
        });
    }

    createCheckout() {
        return this._request({
            uri: `${this._task.site.url}/wallets/checkouts`,
            method: 'post',
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
            formData: JSON.stringify(buildCheckoutForm(this._task)),
        })
        .then((res) => {
            console.log(res.body);
            if (res.statusCode === 303) {
                this._logger.info('Checkout queue, polling %d ms', Checkout.Delays.CheckoutQueue);
                // poll queue
                Checkout._handlePoll(Checkout.Delays.PollCheckoutQueue, 'Waiting in checkout queue..', Checkout.States.CreateCheckout)
                return null;
            } else if (res.statusCode >= 200 && res.statusCode < 300){
                // proceed to `GeneratePaymentToken`
                this._timer.stop(now());
                this._logger.info('Created checkout in %d ms', this._timer.getRunTime());

                return {
                    message: 'Creating payment token',
                    nextState: Checkout.States.GetPaymentToken,
                }
            }
        })
        .catch((err) => {
            this._logger.debug('CHECKOUT: Error creating checkout: %s', err);
            return {
                errors: err,
            }
        });
    }

    async _handlePatchCart() {
        /**
         * // TODO
         * PATCH https://kith.com/wallets/checkouts/43b62a79f39872f9a0010fc9cb8967c6.json
         * payload: {"checkout":{"line_items":[{"variant_id":17402579058757,"quantity":"1","properties":{"MVZtkB3gY9f5SnYz":"nky2UHRAKKeTk8W8"}}]}}
         */
        return this._request({
            uri: `${this._task.checkoutUrl}/cart/`
        })
        // return {
        //     message: 'Added to cart!',
        //     nextState: Checkout.States.GetShippingRates,
        // }
    }

    /**
     * // TODO
     * GET https://kith.com/wallets/checkouts/43b62a79f39872f9a0010fc9cb8967c6/shipping_rates.json
     */
    async _handleGetShippingRates() {
        this._timer.start(now());
        this._logger.verbose('Starting get shipping method request...');

        return this._request({
            uri: `${this._task.site.url}/cart/shipping_rates.json`,
            proxy: formatProxy(this._proxy),
            followAllRedirects: true,
            method: 'get',
            headers: {
                Origin: this._task.site.url,
                'User-Agent': userAgent,
                Referer: this._task.product.url,
            },
            qs: buildShippingRatesForm(this._task),
        })
        .then((res) => {
            const rates = JSON.parse(res);

            if (rates && rates.shipping_rates) {
                let shippingMethod = _.min(rates.shipping_rates, (rate) => {
                    return rate.price;
                })
                this._timer.stop(now());
                this._logger.info('Got shipping method in %d ms', this._timer.getRunTime());
                this._task.product.shipping = {
                    rate: `shopify-${shippingMethod.name.replace('%20', ' ')}-${shippingMethod.price}`,
                    name: `${shippingMethod.name}`,
                    price: `${shippingMethod.price.split('.')[0]}`,
                };
                return {
                    message: `Using shipping method ${shippingMethod.name}`,
                    nextState: Checkout.States.SubmitPayment,
                }
            } else { 
                // TODO -- limit this more maybe?
                this._logger.info('No shipping rates available, polling %d ms', Checkout.Delays.PollShippingRates);
                // poll queue
                return Checkout._handlePoll(Checkout.Delays.PollShippingRates, 'Waiting for shipping rates..', Checkout.States.GetShippingRates)
            } 
        })
        .catch((err) => {
            this._logger.debug('CART: Error getting shipping method: %s', err);
            return {
                errors: err,
            }
        });
    }

    /**
     * Handle CAPTCHA requests
     */
    async _handleRequestCaptcha() {
        this._logger.verbose('CHECKOUT: Getting Solved Captcha...');
        const token = await this._context.getCaptcha();
        this._logger.debug('CHECKOUT: Received token from captcha harvesting: %s', token);
        // TODO - proceed to next state `SubmitPayment`
    }

    async _handleSubmitPayment() {
        // TODO
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
            [Checkout.States.SubmitPayment]: this._handleSubmitPayment,
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

        if (res.nextState === Checkout.States.CheckoutErrors) {
            this._logger.verbose('CHECKOUT: Errored out: %j', res.message)
            return {
                message: res.message,
                nextState: States.Errored,
            };
        } else if (res) {
            this._state = res.nextState;

            if (this._state !== Checkout.States.Finished) {
                return {
                    message: res.message,
                    nextState: States.Checkout,
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