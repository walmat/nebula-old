/**
 * Parse includes
 */
const cheerio = require('cheerio');

/**
 * Form includes
 */
const { buildCartForm, buildPaymentForm } = require('./utils/forms');

/**
 * Utils includes
 */
const {
    formatProxy,
    userAgent,
    request,
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

        this._price;

        this.CART_STATES = {
            CheckoutQueue: 'CHECKOUT_QUEUE',
            OutOfStock: 'OUT_OF_STOCK',
            Success: 'SUCCESS',
        }
    }

    addToCart(variant) {

        this._timer.start(now());

        return request({
            uri: `${this._task.site.url}/cart/add.js`,
            resolveWithFullResponse: true,
            followAllRedirects: true,
            simple: false,
            json: true,
            proxy: formatProxy(this._proxy),
            method: 'post',
            headers: {
                Origin: this._task.site.url,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.8',
            },
            formData: buildCartForm(
                this._task,
                variant,
            ),
        })
        .then((res) => {
            if (res.body.status === 404) {
                console.log(`[ERROR]: CART: Error: ${res.body.description}`);
                return {
                    errors: res.body.description,
                };
            } else {
                this._price = Number.parseInt(this.removeTrailingZeros(res.body.line_price));
                this._task.product.url = `${this._task.site.url}/${res.body.url.split('?')[0]}`;
                this._timer.stop(now());
                console.log(`[INFO]: CART: Added to cart in ${this._timer.getRunTime()}ms`);
                return true;
            }
        })
        .catch((err) => {
            return {
                errors: err,
            }
        })
    }

    proceedToCheckout() {

        this._timer.start(now());

        return request({
            uri: `${this._task.site.url}//checkout.json`,
            method: 'get',
            proxy: formatProxy(this._proxy),
            followAllRedirects: true,
            simple: true,
            json: false,
            resolveWithFullResponse: true,
            headers: {
                'User-Agent': userAgent,
            },
        })
        .then((res) => {

            if (res.request.href.indexOf('throttle') > -1) {
                return {
                    state: this.CART_STATES.CheckoutQueue
                };
            } else if (res.request.href.indexOf('stock_problems') > -1) {
                return {
                    state: this.CART_STATES.OutOfStock
                };
            } else {
                this._timer.stop(now());
                console.log(`[INFO]: CART: Got to checkout in ${this._timer.getRunTime()}ms`);
                const $ = cheerio.load(res.body);
                return {
                    state: this.CART_STATES.Success,
                    checkoutUrl: res.request.href,
                    authToken: $('form input[name=authenticity_token]').attr('value'),
                };
            }
        })
        .catch((err) => {
            return {
                errors: err,
            }
        });
    }

    clearCart() {

        this._timer.start(now());

        return request({
            uri: `${this._task.site.url}/cart/clear.js`,
            proxy: formatProxy(this._proxy),
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
            return {
                cleared: res.item_count === 0,
                errors: null,
            }
        })
        .catch((err) => {
            return {
                errors: err,
            }
        });
    }

    async getEstimatedShippingRates() {

        this._timer.start(now());

        const form = {
            'shipping_address[zip]': this._task.profile.shipping.zipCode,
            'shipping_address[country]': this._task.profile.shipping.country,
            'shipping_address[province]': this._task.profile.shipping.state,
        }

        return request({
            uri: `${this._task.site.url}/cart/shipping_rates.json`,
            proxy: formatProxy(this._proxy),
            followAllRedirects: true,
            method: 'get',
            headers: {
                Origin: this._task.site.url,
                'User-Agent': userAgent,
                Referer: this._task.product.url,
            },
            qs: form,
        })
        .then((res) => {
            const rates = JSON.parse(res);
            // filter this more efficiently
            let shippingMethod = _.min(rates.shipping_rates, (rate) => {
                return rate.price;
            })

            this._timer.stop(now());
            console.log(`[INFO]: CART: Got shipping method in ${this._timer.getRunTime()}ms`)
            return {
                rate: `shopify-${shippingMethod.name.replace('%20', ' ')}-${shippingMethod.price}`,
                name: `${shippingMethod.name}`,
                price: `${shippingMethod.price.split('.')[0]}`,
            }
        });
    }

     /**
     * TODO..
     * Can be made asynchronous at any point in the checkout process
     */
    async getPaymentToken() {

        this._timer.start(now());

        return request({
            uri: `https://elb.deposit.shopifycs.com/sessions`,
            followAllRedirects: true,
            proxy: formatProxy(this._proxy),
            method: 'post',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildPaymentForm(this._task)),
        })
        .then((res) => {
            this._timer.stop(now());
            console.log(`[INFO]: CART: Got payment token in ${this._timer.getRunTime()}ms`)
            return {
                paymentToken: JSON.parse(res).id
            }
        })
        .catch((err) => {
            return {
                errors: err,
            }
        });
    }

    removeTrailingZeros(value) {
        let price = [];
        value = value.toString().split('');
        for (let i = 0; i < value.length; i++) {
            // remove last two zeroes
            if (i < value.length - 2) {
                price.push(value[i])
            }
        }
        return price.join('');
    }
}
module.exports = Cart;