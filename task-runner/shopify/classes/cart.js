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
} = require('./utils');
const now = require('performance-now');

class Cart {
    constructor(context, timer, request) {
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
        this._request = request;

        this._task = this._context.task;
        this._runnerID = this._context.runner_id;
        this._proxy = this._context.proxy;
        this._aborted = this._context.aborted;
        this._logger = this._context.logger;

        this._price = 0;

        this.CART_STATES = {
            CheckoutQueue: 'CHECKOUT_QUEUE',
            OutOfStock: 'OUT_OF_STOCK',
            Success: 'SUCCESS',
        }
    }

    addToCart(variant) {
        this._timer.start(now());
        this._logger.verbose('Starting add to cart...');
        return this._request({
            uri: `${this._task.site.url}/cart/add.js`,
            resolveWithFullResponse: true,
            rejectUnauthorized: false,
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
                this._logger.debug('CART: Error in add to cart response: %s', res.body.description);
                return {
                    errors: res.body.description,
                };
            } else {
                this._price = Number.parseInt(this.removeTrailingZeros(res.body.line_price));
                this._task.product.url = `${this._task.site.url}/${res.body.url.split('?')[0]}`;
                this._timer.stop(now());
                this._logger.info('Added to cart in %d ms', this._timer.getRunTime());
                return true;
            }
        })
        .catch((err) => {
            this._logger.debug('CART: Error in add to cart: %s', res.body.description);
            return {
                errors: err.message,
            }
        })
    }

    proceedToCheckout() {
        this._timer.start(now());
        this._logger.verbose('Starting proceed to checkout request...');
        return this._request({
            uri: `${this._task.site.url}//checkout.json`,
            method: 'get',
            proxy: formatProxy(this._proxy),
            rejectUnauthorized: false,
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
                this._logger.info('Waiting in checkout queue...');
                return {
                    state: this.CART_STATES.CheckoutQueue
                };
            } else if (res.request.href.indexOf('stock_problems') > -1) {
                this._logger.info('Hit out of stock page...');
                return {
                    state: this.CART_STATES.OutOfStock
                };
            } else {
                this._timer.stop(now());
                this._logger.info('Got to checkout in %d ms', this._timer.getRunTime());
                const $ = cheerio.load(res.body);
                return {
                    state: this.CART_STATES.Success,
                    checkoutUrl: res.request.href,
                    authToken: $('form input[name=authenticity_token]').attr('value'),
                };
            }
        })
        .catch((err) => {
            this._logger.debug('CART: Error in proceed to checkout: %s', err);
            return {
                errors: err,
            }
        });
    }

    clearCart() {
        this._timer.start(now());
        this._logger.verbose('CART: Starting clear cart request...');
        return this._request({
            uri: `${this._task.site.url}/cart/clear.js`,
            proxy: formatProxy(this._proxy),
            rejectUnauthorized: false,
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
            this._logger.debug('CART: Cleared cart in %d ms', this._timer.getRunTime());
            return {
                cleared: res.item_count === 0,
                errors: null,
            }
        })
        .catch((err) => {
            this._logger.debug('CART: Error clearing cart: %s', err);
            return {
                errors: err,
            }
        });
    }

    async getEstimatedShippingRates() {
        this._timer.start(now());
        this._logger.verbose('Starting get shipping method request...');
        const form = {
            'shipping_address[zip]': this._task.profile.shipping.zipCode,
            'shipping_address[country]': this._task.profile.shipping.country.label,
            'shipping_address[province]': this._task.profile.shipping.state.label,
        }

        return this._request({
            uri: `${this._task.site.url}/cart/shipping_rates.json`,
            proxy: formatProxy(this._proxy),
            rejectUnauthorized: false,
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
            this._logger.info('Got shipping method in %d ms', this._timer.getRunTime());
            return {
                rate: `shopify-${shippingMethod.name.replace('%20', ' ')}-${shippingMethod.price}`,
                name: `${shippingMethod.name}`,
                price: `${shippingMethod.price.split('.')[0]}`,
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
     * TODO..
     * Can be made asynchronous at any point in the checkout process
     */
    async getPaymentToken() {
        this._timer.start(now());
        this._logger.verbose('Getting Payment Token...');
        return this._request({
            uri: `https://elb.deposit.shopifycs.com/sessions`,
            followAllRedirects: true,
            proxy: formatProxy(this._proxy),
            rejectUnauthorized: false,
            method: 'post',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildPaymentForm(this._task)),
        })
        .then((res) => {
            this._timer.stop(now());
            this._logger.info('Got payment token in %d ms', this._timer.getRunTime());
            return {
                paymentToken: JSON.parse(res).id
            }
        })
        .catch((err) => {
            this._logger.debug('CART: Error getting payment token: %s', err);
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