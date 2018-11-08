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
            Shipping: 'SHIPPING',
            SolveCaptcha: 'SOLVE_CAPTCHA',
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
            console.log('[INFO]: CHECKOUT: Waiting in queue...');
            // TODO - implement a wait of some sort?
            return Checkout.States.ProceedToCheckout;
        } else if (res.state === this._cart.CART_STATES.OutOfStock) {
            console.log('[INFO]: CHECKOUT: Out of stock...');
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
            return Checkout.States.Shipping;
        }
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
     * Submit shipping details
     * @returns {STATE} next checkout state
     */
    async _handleShipping() {
        let opts = await this._shipping.getShippingOptions();

        if (opts.errors) {
            return { errors: opts.errors };
        }

        if (opts.captcha) {
            console.log('[INFO]: CHECKOUT: Requesting to solve captcha...');
            return Checkout.States.SolveCaptcha;
        }

        res = await this._shipping.submitShipping(opts.type, opts.value, opts.authToken);
        
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
    async _handleSolveCaptcha() {
        // TODO - think about how to handle this with captcha and all..
        this._captchaResponse = '';
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
            [Checkout.States.Shipping]: this._handleShipping,
            [Checkout.States.SolveCaptcha]: this._handleSolveCaptcha,
            [Checkout.States.Payment]: this._handlePayment,
            [Checkout.States.Stopped]: this._handleStopped,
        }

        const handler = stateMap[currentState] || defaultHandler;
        return await handler.call(this);
    }

    async run() {
        const nextState =  await this._handleStepLogic(this._state);
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