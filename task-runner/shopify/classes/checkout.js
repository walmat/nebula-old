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
         * Price for the product
         * @type {String}
         */
        this._aborted = this._context.aborted;
        this._state = Checkout.States.Started;

        this._checkoutUrl;
        this._authToken;
        this._price;
        this._shippingValue;
        this._paymentToken;
        this._paymentGateway;
        this._captchaResponse = '';

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
        console.log(`[INFO]: CHECKOUT: Waiting for ${delay} ms...`);
        return new Promise(resolve => setTimeout(resolve, delay));
    };

    /**
     * Checkout process started
     * @returns {STATE} next checkout state
     */
    async _handleStarted() {
        console.log('[INFO]: CHECKOUT: Starting...');
        // if the site requires authentication, 
        if (this._task.username && this._task.password) {
            return Checkout.States.LoginAccount;
        }
        return Checkout.States.AddToCart;
    }

    async _handleLogin() {
        console.log('[INFO]: CHECKOUT: Logging in...');
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
        const res = await this._cart.addToCart(this._task.product.variants[this._variantIndex]);
        if (res.errors) {
            return { errors: res.errors };
        }
        if(!res) {
            // TODO - rethink this logic a bit? What should happen if we fail the add to cart?
            // ...but what if the variant isn't live yet?
            return Checkout.States.AddToCart;
        }
        this._price = this._cart._price;
        return Checkout.States.GeneratePaymentToken;
    }

    /**
     * Get payment token
     * @returns {STATE} next checkout state
     */
    async _handlePaymentToken() {
        const res = await this._cart.getPaymentToken();
        if (res.errors) {
            return { errors: res.errors };
        }
        if(!res.paymentToken) {
            console.log('[ERROR]: CHECKOUT: Failed fetching payment token...');
            // TODO - handle failed to get payment token
            return Checkout.States.Stopped;
        }
        this._paymentToken = res.paymentToken;
        return Checkout.States.ProceedToCheckout;
    }

    /**
     * Get checkout data
     * @returns {STATE} next checkout state
     */
    async _handleProceedToCheckout() {
        const res = await this._cart.proceedToCheckout();

        if (res.errors) {
            return { errors: res.errors }; 
        }

        if (res.state === this._cart.CART_STATES.CheckoutQueue) {
            return Checkout.States.CheckoutQueue;
        } else if (res.state === this._cart.CART_STATES.OutOfStock) {
            return Checkout.States.OutOfStock;
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
            return Checkout.States.GetShipping;
        }
    }

    async _handleCheckoutQueue() {
        this._waitForDelay(500);
        return Checkout.States.ProceedToCheckout;
    }

    /**
     * Run restocks/swap sizes
     * @returns {STATE} next checkout state
     */
    async _handleOutOfStock() {
        this._variantIndex++;
        if (this._variantIndex >= this._task.sizes.length) {
            this._variantIndex = 0;
        }
        if (this._task.sizes.length > 1) {
            // TODO - make a CartManager that will be able to handle multiple carts
            // create background thread to run for restocks, and check next size?
            console.log('[INFO]: CHECKOUT: Swapping to next size...');
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
            console.log('[INFO]: CHECKOUT: Running for restocks...');
            return Checkout.States.Restock;
        }
    }

    /**
     * Submit `GET` shipping details
     * @returns {STATE} next checkout state
     */
    async _handleGetShipping() {
        let opts = await this._shipping.getShippingOptions();

        if (opts.errors) {
            return { errors: opts.errors };
        }

        // TODO: Replace this correct values -- Objects won't work, it needs to be just a State
        if (opts.captcha) {
            console.log('[INFO]: CHECKOUT: Requesting to solve captcha...');
            return { message: 'Waiting for captcha', nextState: Checkout.States.RequestCaptcha };
        } else if (opts.newAuthToken) {
            this._authToken = opts.newAuthToken;
            return { message: 'Posting Shipping', nextState: Checkout.States.PostShipping };
        } else {
            return { message: 'Error posting shipping.', nextState: Checkout.States.GetShipping };
        }
    }

    /**
     * Handle CAPTCHA requests
     */
    async _handleRequestCaptcha() {
        console.log('waiting for captcha....');
        const token = await this._context.getCaptcha();
        console.log(`[DEBUG]: CHECKOUT: Received token from captcha harvesting: ${token}`);
        // TODO: Replace this with an actual test!
        if (token) {
            this._context.stopHarvestCaptcha();
            return Checkout.States.PostShipping;
        }
        return Checkout.States.RequestCaptcha;
    }

    /**
     * Submit `POST` Shipping details
     */
    async _handlePostShipping() {
        let opts = await this._shipping.submitShippingOptions(this._authToken);

        if (opts.errors) {
            return {message: opts.errors, nextState: Checkout.States.Stopped };
        }

        let res = await this._shipping.submitShipping(opts.type, opts.value, this._authToken);
        
        if (res.errors) {
            return { errors: res.errors };
        }
        
        if (res.paymentGateway && res.newAuthToken) {
            console.log('[INFO]: CHECKOUT: Proceeding to submit payment...');
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
            return Checkout.States.Payment;
        }
        console.log('[ERROR]: CHECKOUT: Unable to submit shipping...');
        return Checkout.States.Stopped;
    }

    /**
     * Submit shipping details
     * @returns {STATE} next checkout state
     */
    async _handlePayment() {
        const res = await this._payment.submit();

        if (res.errors) {
            console.log(`[ERROR]: CHECKOUT: Payment handler failed: ${res.errors}`);
            throw new Error(res.errors);
        }

        if (res === this._payment.PAYMENT_STATES.Error) {
            return Checkout.States.Stopped;
        } else if (res === this._payment.PAYMENT_STATES.Processing) {
            return Checkout.States.Stopped;
        } else if (res === this._payment.PAYMENT_STATES.Declined) {
            return Checkout.States.PaymentError;
        } else if (res === this._payment.PAYMENT_STATES.Success) {
            return Checkout.States.Stopped; 
        } else {
            return Checkout.States.Stopped;
        }
    }

    async _handleStopped() {
        console.log('[INFO]: CHECKOUT: Shopping checkout process...');
        return Checkout.States.Stopped;
        // TODO - handle a clean shut down..
    }

    async _handleStepLogic(currentState) {
        async function defaultHandler() {
            // throw new Error('Reached Unknown State!');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return currentState;
        }

        console.log(`[TRACE]: CHECKOUT: Handling State: ${JSON.stringify(currentState, null, 2)} ...`);

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
        const nextState =  await this._handleStepLogic(this._state);
        console.log('[TRACE]: CHECKOUT: Next State chosen as: ' + nextState);
        if(nextState.errors) {
            return {
                nextState: States.Checkout,
                errors: nextState.errors,
            }
        }
        this._state = nextState;
        if (this._state !== Checkout.States.Stopped ||
            this._state !== Checkout.States.PaymentProcessing ||
            this._state !== Checkout.States.Error) {
            return {
                nextState: States.Checkout,
            }
        }
        return {
            nextState: States.Finished,
            errors: null,
        }

    }
}

module.exports = Checkout;