const { States } = require('../taskRunner').States;
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

const {
    formatProxy,
    userAgent,
} = require('./utils');
const _ = require('underscore');
const buildForm = require('./utils/buildForm');


class Cart {

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
         * destructuring to help save me some typing...
         */
        this._task = this._context.task;
        this._runnerID = this._context.runner_id;
        this._proxy = this._context.proxy;
        this._aborted = this._context.aborted;

    }

    addToCart() {
        if (this._aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }

        return rp({
            uri: `${this._task.site.url}/cart/${this._task.product.variant}:1`,
            resolveWithFullResponse: true,
            followAllRedirects: true,
            simple: false,
            proxy: formatProxy(this._proxy),
            method: 'get',
            headers: {
                Origin: this._task.site.url,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: this._task.product.url,
                'Accept-Language': 'en-US,en;q=0.8',
            },
        })
        .then((res) => {
            return {res: res, body: res.body};
        })
        .catch((err) => {
            return null;
        });
    }

    removeFromCart(variant, quantity) {
        if (this._aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }

        return rp({
            uri: `${this._task.site.url}/cart/change.js`,
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
            qs: {
                id: variant,
                quantity: quantity,
            },
        })
        .then((res) => {
            return res.item_count === 0;
        })
        .catch((err) => {
            return res.item_count; // didn't remove correctly..
        })
    }

    clearCart() {
        if (this._aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }

        return rp({
            uri: `${this._task.site.url}/cart/clear.js`,
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
        })
        .then((res) => {
            return res.item_count === 0;
        })
        .catch((err) => {
            return res.item_count; // didn't remove correctly..
        })
    }

    getEstimatedShippingRates() {
        if (this._aborted) {
            return States.Aborted;
        }
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
            console.log(res);
            // filter this more efficiently
            let lowest_rate = Number.MAX_SAFE_INTEGER;
            rates.shipping_rates.forEach((rate) => {
                if (rate.source === 'shopify') {
                    if (rate.price < lowest_rate) {
                        lowest_rate = rate.price;
                    }
                }
            });
            return lowest_rate;
        })
        .catch((err) => {
            return null;
        });
    }
}
module.exports = Cart;