/**
 * Parse includes
 */
const cheerio = require('cheerio');
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

/**
 * Form includes
 */
const { buildCartForm } = require('./utils/forms');

/**
 * Utils includes
 */
const {
    formatProxy,
    userAgent,
} = require('./utils');
const now = require('performance-now');

class Cart {

    constructor(context, timer) {
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
        this._timer = timer;

        this._task = this._context.task;
        this._runnerID = this._context.runner_id;
        this._proxy = this._context.proxy;
        this._aborted = this._context.aborted;

        this.CART_STATES = {
            CheckoutQueue: 'CHECKOUT_QUEUE',
            OutOfStock: 'OUT_OF_STOCK',
        }
    }

    addToCart() {
        if (this._aborted) {
            console.log('[INFO]: CART: Abort detected, aborting...');
            return -1;
        }

        this._timer.start(now());

        return rp({
            uri: `${this._task.site.url}/cart/add.js`,
            resolveWithFullResponse: true,
            followAllRedirects: true,
            simple: true,
            json: true,
            proxy: formatProxy(this._proxy),
            method: 'get',
            headers: {
                Origin: this._task.site.url,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.8',
            },
            qs: buildCartForm(
                this._task,
            ),
        })
        .then((res) => {
            if (res.body.status === 404) {
                console.log(`[DEBUG]: CART: Error: ${res.body.description}`);
                return false;
            } else {
                this._timer.stop(now());
                console.log(`[DEBUG]: CART: Added to cart in ${this._timer.getRunTime()}ms`);
                console.log(`[DEBUG]: CART: Added to cart, going to checkout!`);
                return true;
            }
        })
        .catch((err) => {
            console.log(`[DEBUG]: CART: ${err}`);
            return err;
        });
    }

    proceedToCheckout() {
        if (this._aborted) {
            console.log('[INFO]: CART: Abort detected, aborting...');
            return -1;
        }

        this._timer.start(now());

        return rp({
            uri: `${this._task.site.url}//checkout.json`,
            method: 'get',
            followAllRedirects: true,
            simple: false,
            json: false,
            resolveWithFullResponse: true,
            headers: {
                'User-Agent': userAgent,
            },
        })
        .then((res) => {
            if (this._aborted) {
                console.log('[INFO]: CART: Abort detected, aborting...');
                return -1;
            }

            this._timer.stop(now());
            console.log(`[DEBUG]: CART: Got to checkout in ${this._timer.getRunTime()}ms`);

            if (res.request.href.indexOf('throttle') > -1) {
                return this.CART_STATES.CheckoutQueue;
            } else if (res.statusCode === 200 && res.request.href.indexOf('stock_problems') > -1) {
                return this.CART_STATES.OutOfStock;
            } else if (res.statusCode === 200) {
                const $ = cheerio.load(res.body);
                return {
                    checkoutHost: `https://${res.request.originalHost}`,
                    checkoutUrl: res.request.href,
                    checkoutId: res.request.href.split('checkouts/')[1],
                    storeId: res.request.href.split('/')[3],
                    authToken: $('form input[name=authenticity_token]').attr('value'),
                    price: $('span.payment-due__price').text().trim(),
                };
            }
        });
    }

    clearCart() {
        if (this._aborted) {
            console.log('[INFO]: CART: Abort detected, aborting...');
            return -1;
        }

        this._timer.start(now());

        return rp({
            uri: `${this._task.site.url}/cart/clear.js`,
            followAllRedirects: true,
            json: true,
            method: 'POST',
            headers: {
                Origin: this._task.site.url,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: this._task.product.url,
                'Accept-Language': 'en-US,en;q=0.8',
            },
        })
        .then((res) => {
            this._timer.stop(now());
            console.log(`[DEBUG]: CART: Cleared cart in ${this._timer.getRunTime()}ms`);
            return res.item_count === 0;
        });
    }

    async getEstimatedShippingRates() {
        if (this._aborted) {
            console.log('[INFO]: CART: Abort detected, aborting...');
            return -1;
        }

        this._timer.start(now());

        return rp({
            uri: `${this._task.site.url}/cart/shipping_rates.json`,
            followAllRedirects: true,
            method: 'POST',
            headers: {
                Origin: this._task.site.url,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: this._task.product.url,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            formData: {
                'shipping_address[zip]': this._task.profile.shipping.zipCode,
                'shipping_address[country]': this._task.profile.shipping.country,
                'shipping_address[province]': this._task.profile.shipping.state,
            }
        })
        .then((res) => {
            const rates = JSON.parse(res);
            // filter this more efficiently
            let lowest_rate = Number.MAX_SAFE_INTEGER;
            let shippingMethod;
            rates.shipping_rates.forEach((rate) => {
                if (rate.source === 'shopify') {
                    if (rate.price < lowest_rate) {
                        shippingMethod = rate;
                        lowest_rate = rate.price;
                    }
                }
            });

            this._timer.stop(now());
            console.log(`[DEBUG]: CART: Got shipping method in ${this._timer.getRunTime()}ms`)

            // shipping option to use, meaning we don't have to parse for it later..
            return `shopify-${shippingMethod.name.replace('%20', ' ')}-${shippingMethod.price}`
        });
    }

     /**
     * TODO..
     * Can be made asynchronous at any point in the checkout process
     */
    async getPaymentToken() {
        if (this._aborted) {
            console.log('[INFO]: CART: Abort detected, aborting...');
            return -1;
        }

        const paymentInfo = {
            'credit_card': {
                'number': this._task.profile.payment.cardNumber,
                'verification_value': this._task.profile.payment.cvv,
                'name': `${this._task.profile.billing.firstName} ${this._task.profile.billing.lastName}`,
                'month': parseInt(this._task.profile.payment.exp.slice(0,2)),
                'year': parseInt(this._task.profile.payment.exp.slice(3,5)),
            }
        };

        this._timer.start(now());

        return rp({
            uri: `https://elb.deposit.shopifycs.com/sessions`,
            followAllRedirects: true,
            proxy: formatProxy(this._proxy),
            method: 'post',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentInfo),
        })
        .then((res) => {
            this._timer.stop(now());
            console.log(`[DEBUG]: CART: Got payment token in ${this._timer.getRunTime()}ms`)
            return JSON.parse(res).id;
        });
    }
}
module.exports = Cart;