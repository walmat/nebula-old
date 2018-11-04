/**
 * Local class includes
 */
const Cart = require('./cart');
const Shipping = require('./shipping');
const Payment = require('./payment');
const Account = require('./account');
const Timer = require('./timer');
const now = require('performance-now');

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
            ProceedToCheckout: 'PROCEED_TO_CHECKOUT',
            CheckoutQueue: 'CHECKOUT_QUEUE',
            OutOfStock: 'OUT_OF_STOCK',
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
        this._id = this._context.runner_id;

         /**
         * Task Data for the running task
         * @type {TaskObject}
         */
        this._task = this._context.task;

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
        this._captchaResponse;

        this._retries = {
            LOGIN: 5,
            ADD_TO_CART: 5,
            SHIPPING: 5,
            PAYMENT: 5,
        }

        /**
         * Class Instantiations
         */
        this._timer = new Timer();
        this._cart = new Cart(context, this._timer);
        this._shipping = null;
        this._payment = null;
        this._account = new Account(context, this._timer);
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
        console.log('[INFO]: CHECKOUT: Loggnig in...');
        const res = await this._account.login();
        this._retries.LOGIN--;
        if (res === this._account.ACCOUNT_STATES.LoggedIn) {
            return Checkout.States.AddToCart
        } else if (this._retries.LOGIN > 0) {
            return Checkout.States.LoginAccount;
        } else {
            return Checkout.States.Stopped;
        }
    }

    /**
     * Add to cart
     * @returns {STATE} next checkout state
     */
    async _handleAddToCart() {
        const res = await this._cart.addToCart();
        if(!res) {
            this._retries.ADD_TO_CART--;
            console.log('[ERROR]: CHECKOUT: Failed adding to cart...');
            // TODO - failed to add to cart..
            if (this._retries.ADD_TO_CART > 0) {
                return Checkout.States.AddToCart;
            } else {
                return Checkout.States.Stopped;
            }
        }
        return Checkout.States.GeneratePaymentToken;
    }

    /**
     * Get payment token
     * @returns {STATE} next checkout state
     */
    async _handlePaymentToken() {
        const paymentToken = await this._cart.getPaymentToken();
        if(!paymentToken) {
            console.log('[ERROR]: CHECKOUT: Failed fetching payment token...');
            // TODO - handle failed to get payment token
        }
        return Checkout.States.ProceedToCheckout;
    }

    /**
     * Get checkout data
     * @returns {STATE} next checkout state
     */
    async _handleProceedToCheckout() {
        const res = await this._cart.proceedToCheckout();
        if(res.state === this._cart.CART_STATES.CheckoutQueue) {
            console.log('[INFO]: CHECKOUT: Waiting in queue...');
            // TODO - implement a wait of some sort?
            return Checkout.States.ProceedToCheckout;
        } else if (res.state === this._cart.CART_STATES.OutOfStock) {
            console.log('[INFO]: CHECKOUT: Out of stock...');
            return Checkout.States.OutOfStock;
        } else if (res.state === this._cart.CART_STATES.Success) {
            console.log('[INFO]: CHECKOUT: Proceeding to checkout...');            
            
            this._checkoutUrl = res.checkoutUrl;
            this._authToken = res.authToken;
            this._price = res.price;

            this._shipping = new Shipping(
                this._context,
                this._timer,
                this._checkoutUrl,
                this._authToken,
                this._price,
            );
            return Checkout.States.Shipping;
        }
    }

    /**
     * Run restocks/swap sizes
     * @returns {STATE} next checkout state
     */
    async _handleOutOfStock() {
        if (this._task.sizes.length > 1) {
            // swap sizes?
            console.log('[INFO]: CHECKOUT: Swapping to next size...');
        } else {
            // run restocks
            console.log('[INFO]: CHECKOUT: Running for restocks...');
        }
    }

    /**
     * Submit shipping details
     * @returns {STATE} next checkout state
     */
    async _handelShipping() {
        const res = await this._shipping.submit();
        if (!res) {
            this._retries.SHIPPING--;
            if (this._retries.SHIPPING > 0) {
                return Checkout.States.Shipping; 
            } else {
                return Checkout.States.Stopped;
            }
        }

        if (res.captcha) {
            console.log('[INFO]: CHECKOUT: Requesting to solve captcha...');
            return Checkout.States.SolveCaptcha;
        } else if (res.authToken) {
            console.log('[INFO]: CHECKOUT: Proceeding to submit payment...');
                this._payment = new Payment(
                this._context,
                this._timer,
                this._checkoutUrl,
                res.authToken,
                this._price,
                this._shippingValue,
                this._captchaResponse,
            );
            return Checkout.States.Payment;
        }
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
        if (res === this._payment.PAYMENT_STATES.Error) {
            console.log('[INFO]: CHECKOUT: Error submitting payment...');
            this._retries.PAYMENT--;
            if (this._retries.PAYMENT > 0) {
                return Checkout.States.Payment; 
            } else {
                return Checkout.States.Stopped;
            }
        } else if (res === this._payment.PAYMENT_STATES.Processing) {
            console.log('[INFO]: CHECKOUT: Payment processing, check email...');
            return Checkout.States.PaymentProcessing;
        } else if (res === this._payment.PAYMENT_STATES.Declined) {
            console.log('[INFO]: CHECKOUT: Error submitting payment...');
            return Checkout.States.PaymentError;
        } else if (res === this._payment.PAYMENT_STATES.Success) {
            console.log('[INFO]: CHECKOUT: Success, check email...');
            return Checkout.States.PaymentFinished; 
        } else {
            console.log('[INFO]: CHECKOUT: Error submitting payment...');
            this._retries.PAYMENT--;
            if (this._retries.PAYMENT > 0) {
                return Checkout.States.Payment; 
            } else {
                return Checkout.States.Stopped;
            }
        }
    }

    async _handleStopped() {
        console.log('[INFO]: CHECKOUT: Stopping...');
        process.exit(1);
        // TODO - handle a clean shut down..
    }

    async _handleStepLogic(currentState) {
        const stateMap = {
            [Checkout.States.Started]: this._handleStarted,
            [Checkout.States.LoginAccount]: this._handleLogin,
            [Checkout.States.AddToCart]: this._handleAddToCart,
            [Checkout.States.GeneratePaymentToken]: this._handlePaymentToken,
            [Checkout.States.ProceedToCheckout]: this._handleProceedToCheckout,
            [Checkout.States.OutOfStock]: this._handleOutOfStock,
            [Checkout.States.Shipping]: this._handelShipping,
            [Checkout.States.SolveCaptcha]: this._handleSolveCaptcha,
            [Checkout.States.Payment]: this._handlePayment,
            [Checkout.States.Stopped]: this._handleStopped,
        }

        const handler = stateMap[currentState];
        return await handler.call(this);
    }

    async run() {
        this._state = Checkout.States.Started;
        while(this._state !== Checkout.States.Stopped ||
              this._state !== Checkout.States.PaymentProcessing ||
              this._state !== Checkout.States.PaymentFinished
            ) {
            this._state = await this._handleStepLogic(this._state);
            if (this._context.aborted) {
                this._state = Checkout.States.Stopped;
            }
        }

        // TODO - maybe needs some cleanup here?
    }
}

module.exports = Checkout;