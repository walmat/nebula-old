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

        /**
         * Constants
         */

        this.QUEUE_POLLING_RATE = 1500;

        /**
         * Class Instantiations
         */
        this._timer = new Timer();
        this._cart = new Cart(context, this._timer);
        this._shipping = null; // fix later..
        this._payment = null; // fix later..
        this._account = new Account(context, this._timer);
    }

    async run () {
        if (this._aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return -1;
        }

        // add to cart...
        await this._cart.addToCart()
        .then(async (res) => {
            // proceed to checkout...
            // TODO - get shippingValue asynchronously
            let shippingValue = await this._cart.getPaymentToken();
            this._cart.proceedToCheckout()
            .then(async (checkoutData) => {
                if (checkoutData === this._cart.CART_STATES.CheckoutQueue) {
                    setTimeout(this._cart.proceedToCheckout(), this.QUEUE_POLLING_RATE);
                } else if (checkoutData === this._cart.CART_STATES.OutOfStock) {
                    // out of stock
                }

                // instantiate shipping class
                this._shipping = new Shipping(
                    this._context, 
                    this._timer,
                    checkoutData.checkoutHost,
                    checkoutData.checkoutUrl,
                    checkoutData.checkoutId,
                    checkoutData.storeId,
                    checkoutData.authToken,
                    checkoutData.price,
                );
                await this._shipping.submit()
                .then(async (newAuthToken) => {
                    const captchaResponse = '';
                    this._payment = new Payment(
                        this._context,
                        this._timer,
                        checkoutData.checkoutUrl,
                        newAuthToken,
                        checkoutData.price,
                        shippingValue,
                        captchaResponse,
                    );
                    await this._payment.submit()
                    .then(async(state) => {
                        console.log(`[DEBUG]: CHECKOUT: ${state}`);
                    });
                });
            });
        });
    }
}

module.exports = Checkout;