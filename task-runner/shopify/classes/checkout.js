/**
 * Local class includes
 */
const Cart = require('./cart');
const Shipping = require('./shipping');
const Payment = require('./payment');
const Account = require('./account');
const Timer = require('./timer');
const { States } = require('./utils/constants').TaskRunner;
const fs = require('fs');
const path = require('path');

class Checkout {

    /**
     * Task Runner States
     */
    static get States() {
        return {
            Started: 'STARTED',
            Stopped: 'STOPPED',
            LoginAccount: 'LOGIN_ACCOUNT',
            AddToCart: 'ADD_TO_CART',
            GetShippingRates: 'GET_SHIPPING_RATES',
            GeneratePaymentToken: 'GENERATE_PAYMENT_TOKEN',
            ProceedToCheckout: 'PROCEED_TO_CHECKOUT',
            CheckoutQueue: 'CHECKOUT_QUEUE',
            OutOfStock: 'OUT_OF_STOCK',
            Restock: 'RESTOCK',
            GetShipping: 'GET_SHIPPING',
            RequestCaptcha: 'REQUEST_CAPTCHA',
            PostShipping: 'POST_SHIPPING',
            Payment: 'PAYMENT',
            PaymentError: 'PAYMENT_ERROR',
            PaymentProcessing: 'PAYMENT_PROCESSING',
            PaymentFinished: 'PAYMENT_FINISHED',
        };
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
         * ID of the given task runner
         */
        this._id = this._context.id;

         /**
         * Task Data for the running task
         * @type {TaskObject}
         */
        this._task = this._context.task;

        /**
         * Cookie jar to use for the task
         * @type {CookieJar}
         */
        this._jar = this._context.jar;

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
         */
        this._logger = this._context.logger;

        this._state = Checkout.States.Started;
        this._checkoutUrl;
        this._authToken;
        this._price;
        this._shippingValue;
        this._shippingOpts;
        this._paymentToken;
        this._paymentGateway;

        this._variantIndex = 0;

        this._request = require('request-promise').defaults({
            timeout: 10000,
            jar: this._jar,
        })

        /**
         * Class Instantiations
         */
        this._timer = new Timer();
        this._cart = new Cart(context, this._timer, this._request);
        this._shipping = null;
        this._payment = null;
        this._account = new Account(context, this._timer, this._request);
    }

    _waitForDelay(delay) {
        this._logger.silly('CHECKOUT: Waiting for %s ms...', delay);
        return new Promise(resolve => setTimeout(resolve, delay));
    };

    /**
     * Checkout process started
     * @returns {STATE} next checkout state
     */
    async _handleStarted() {
        this._logger.verbose('CHECKOUT: Starting...');
        // if the site requires authentication, 
        if (this._task.username && this._task.password) {
            return Checkout.States.LoginAccount;
        }
        return { message: 'Adding to cart...', nextState: Checkout.States.AddToCart };
    }

    async _handleLogin() {
        this._logger.verbose('CHECKOUT: Logging in...');
        const res = await this._account.login();
        if (res.errors) {
            return { errors: res.errors };
        } else if (res === this._account.ACCOUNT_STATES.LoggedIn) {
            return Checkout.States.AddToCart
        } else {
            return Checkout.States.Stopped;
        }
    }

    /**
     * Add to cart
     * @returns {STATE} next checkout state
     */
    async _handleAddToCart() {
        this._logger.verbose('CHECKOUT: Adding to Cart...');
        const res = await this._cart.addToCart(this._task.product.variants[this._variantIndex]);
        console.log(res);
        if (res.errors) {
            this._logger.verbose('CHECKOUT: Errors in Add to Cart: %s', res.errors);
            return { message: res.errors, nextState: Checkout.States.Stopped };
        }
        if(!res) {
            this._logger.verbose('CHECKOUT: Failed to Add to Cart');
            // TODO - rethink this logic a bit? What should happen if we fail the add to cart?
            // ...but what if the variant isn't live yet?
            return { message: 'Adding to cart', nextState: Checkout.States.AddToCart };
        }
        this._price = this._cart._price;
        return { message: 'Proceeding to checkout..', nextState: Checkout.States.GeneratePaymentToken };
    }

    /**
     * Get payment token
     * @returns {STATE} next checkout state
     */
    async _handlePaymentToken() {
        this._logger.verbose('CHECKOUT: Generating Payment Token...');
        const res = await this._cart.getPaymentToken();
        if (res.errors) {
            return { errors: res.errors };
        }
        if(!res.paymentToken) {
            this._logger.verbose('CHECKOUT: Failed fetching payment token');
            // TODO - handle failed to get payment token
            return Checkout.States.Stopped;
        }
        this._paymentToken = res.paymentToken;
        return { message: 'Generating payment token', nextState: Checkout.States.ProceedToCheckout };
    }

    /**
     * Get checkout data
     * @returns {STATE} next checkout state
     */
    async _handleProceedToCheckout() {
        this._logger.verbose('CHECKOUT: Proceeding to Checkout...');
        const res = await this._cart.proceedToCheckout();
        if (res.errors) {
            this._logger.verbose('CHECKOUT: Errors: %s', res.errors);
            return { errors: res.errors }; 
        }

        if (res.state === this._cart.CART_STATES.CheckoutQueue) {
            console.log('[INFO]: CHECKOUT: Waiting in queue...');
            // TODO - implement a wait of some sort?
            return { message: 'Waiting in queue..', nextState: Checkout.States.ProceedToCheckout };
        } else if (res.state === this._cart.CART_STATES.OutOfStock) {
            console.log('[INFO]: CHECKOUT: Out of stock...');
            return { message: 'Out of stock', nextState: Checkout.States.OutOfStock };
        } else if (res.state === this._cart.CART_STATES.Success) {            
            
            this._checkoutUrl = res.checkoutUrl.split('?')[0];
            this._authToken = res.authToken;

            this._shipping = new Shipping(
                this._context,
                this._timer,
                this._request,
                this._checkoutUrl,
                this._authToken,
                this._shippingValue,
            );
            return { message: 'Submitting shipping', nextState: Checkout.States.Shipping };
        }
    }

    async _handleCheckoutQueue() {
        this._logger.verbose('CHECKOUT: Handling Checkout Queue...');
        this._logger.silly('TODO: Need to Implement this!');
        this._waitForDelay(500);
        return Checkout.States.ProceedToCheckout;
    }

    /**
     * Run restocks/swap sizes
     * @returns {STATE} next checkout state
     */
    async _handleOutOfStock() {
        this._logger.verbose('CHECKOUT: Handling Out of Stock...');
        this._variantIndex++;
        if (this._variantIndex >= this._task.sizes.length) {
            this._variantIndex = 0;
        }
        if (this._task.sizes.length > 1) {
            // TODO - make a CartManager that will be able to handle multiple carts
            // create background thread to run for restocks, and check next size?
            this._logger.info('Swapping to Next Size...');
            const res = await this._cart.clearCart();
            
            if (res.errors) {
                return { errors: res.errors };
            }

            if (res.cleared) {
                return Checkout.States.AddToCart
            }
            return Checkout.States.Stopped;
        } else {
            // run restocks for the one size..
            this._logger.info('Running for Restocks');
            return { message: 'Running for Restocks', nextState: Checkout.States.Restock };
        }
    }

    /**
     * Submit `GET` shipping details
     * @returns {STATE} next checkout state
     */
    async _handleGetShipping() {
        this._logger.verbose('CHECKOUT: Starting Shipping...')
        let opts = await this._shipping.getShippingOptions();
        if (opts.errors) {
            return { message: opts.errors, nextState: Checkout.States.Stopped };
        }
        this._authToken = opts.newAuthToken;

        if (opts.captcha) {
            this._logger.info('Requesting to solve captcha...');
            return Checkout.States.RequestCaptcha;
        }

        this._logger.verbose('Captcha Bypassed, Proceeding with Shipping...');
        opts = await this._shipping.submitShippingOptions(this._authToken);
        if (opts.errors) {
            return { errors: opts.errors };
        }

        this._shippingOpts = {
            type: opts.type,
            value: opts.value,
            authToken: opts.authToken,
        }

        return Checkout.States.PostShipping;
    }

    /**
     * Handle CAPTCHA requests
     */
    async _handleRequestCaptcha() {
        this._logger.verbose('CHECKOUT: Getting Solved Captcha...');
        const token = await this._context.getCaptcha();
        this._logger.debug('CHECKOUT: Received token from captcha harvesting: %s', token);

        let opts = await this._shipping.submitShippingOptions(this._authToken, token);
        if (opts.errors) {
            return { errors: opts.errors };
        }

        this._shippingOpts = {
            type: opts.type,
            value: opts.value,
            authToken: opts.authToken,
        }

        this._context.stopHarvestCaptcha();
        return Checkout.States.PostShipping;
    }

    /**
     * Submit `POST` Shipping details
     */
    async _handlePostShipping() {
        this._logger.verbose('CHECKOUT: Continuing with Shipping...');
        let { type, value, authToken } = this._shippingOpts;
        let res = await this._shipping.submitShipping(type, value, authToken);
        if (res.errors) {
            return { message: res.errors, nextState: Checkout.States.Stopped };
        }
        
        if (res.paymentGateway && res.newAuthToken) {
            this._logger.info('Proceeding to submit payment');
            this._authToken = res.newAuthToken;
            this._paymentGateway = res.paymentGateway;
            this._price = res.price;
            this._payment = new Payment(
                this._context,
                this._timer,
                this._request,
                this._checkoutUrl,
                this._authToken,
                this._price,
                this._paymentGateway,
                this._paymentToken,
                this._shippingValue,
                this._captchaResponse,
            );
            return { message: 'Submitting payment', nextState: Checkout.States.Payment };
        }
        this._logger.info('Unable to submit shipping!');
        return Checkout.States.Stopped;
    }

    /**
     * Submit shipping details
     * @returns {STATE} next checkout state
     */
    async _handlePayment() {
        this._logger.verbose('CHECKOUT: Submitting Payment...');
        const res = await this._payment.submit();
        if (res.errors) {
            throw new Error(res.errors);
        }

        if (res === this._payment.PAYMENT_STATES.Error) {
            return { message: 'Error submitting payment', nextState: Checkout.States.Stopped };
        } else if (res === this._payment.PAYMENT_STATES.Processing) {
            return { message: 'Payment Processing, check email.', nextState: Checkout.States.Stopped };
        } else if (res === this._payment.PAYMENT_STATES.Declined) {
            return { message: 'Payment declined.', nextState: Checkout.States.PaymentError };
        } else if (res === this._payment.PAYMENT_STATES.Success) {
            return { message: 'Copped!', nextState: Checkout.States.Stopped };
        } else {
            return { message: 'Unknown error! Stopping task..', nextState: Checkout.States.Stopped };
        }
    }

    async _handleStopped() {
        this._logger.verbose('CHECKOUT: Stopping checkout process...');
        return { message: 'Stopping task...', nextState: Checkout.States.Stopped };
    }

    async _handleStepLogic(currentState) {
        async function defaultHandler() {
            throw new Error('Reached Unknown State!');
        }
        this._logger.verbose('CHECKOUT: Handling State: %s ...', currentState);
        const stateMap = {
            [Checkout.States.Started]: this._handleStarted,
            [Checkout.States.LoginAccount]: this._handleLogin,
            [Checkout.States.AddToCart]: this._handleAddToCart,
            [Checkout.States.GeneratePaymentToken]: this._handlePaymentToken,
            [Checkout.States.ProceedToCheckout]: this._handleProceedToCheckout,
            [Checkout.States.OutOfStock]: this._handleOutOfStock,
            [Checkout.States.CheckoutQueue]: this._handleCheckoutQueue,
            [Checkout.States.GetShipping]: this._handleGetShipping,
            [Checkout.States.PostShipping]: this._handlePostShipping,
            [Checkout.States.RequestCaptcha]: this._handleRequestCaptcha,
            [Checkout.States.Payment]: this._handlePayment,
            [Checkout.States.Stopped]: this._handleStopped,
        }

        const handler = stateMap[currentState] || defaultHandler;
        return await handler.call(this);
    }

    async run() {
        const res = await this._handleStepLogic(this._state);
        this._logger.verbose('CHECKOUT: Next State chosen as: %s', nextState);
        if (res.nextState === Checkout.States.Error) {
            this._logger.verbose('CHECKOUT: Completed with errors: %j', nextState.errors);
            return {
                message: res.errors,
                nextState: States.Stopped,
            }
        } else if (res) {
            this._state = res.nextState;
        }

        if (this._state !== Checkout.States.Stopped &&
            this._state !== Checkout.States.PaymentProcessing &&
            this._state !== Checkout.States.Error) {
            return {
                message: res.message,
                nextState: States.Checkout,
            }
        }
        
        return {
            message: res.message,
            nextState: States.Stopped,
        }

    }
}

module.exports = Checkout;