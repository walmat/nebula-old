const { States } = require('../taskRunner').States;
const jar = require('request-promise').jar();
const cheerio = require('cheerio');
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

const {
    formatProxy,
    userAgent,
} = require('./utils');
const _ = require('underscore');
const {
    buildCartForm
} = require('./utils/forms');


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
                Referer: this._task.product.url,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            formData: buildCartForm(
                this._task,
            ),
        })
        .then((res) => {
            if (this._aborted) {
                console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
                return States.Aborted;
            }

            if (Object.keys(res).length > 0) {
                return rp({
                    uri: `${this._task.site.url}//checkout.json`,
                    method: 'get',
                    followAllRedirects: true,
                    simple: false,
                    json: false,
                    resolveWithFullResponse: true,
                    headers: {
                        'User-Agent': userAgent,
                    }
                })
                .then((res) => {
                    if (this._aborted) {
                        console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
                        return States.Aborted;
                    }

                    if (res.statusCode === 200) {
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
                })
                .catch((err) => {
                    console.log('2nd request failed');
                    // TODO
                })
            }
        })
        .catch((err) => {
            console.log('1st request failed');
            // TODO
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
            // TODO - didn't remove correctly..
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
            return res.item_count; // didn't remove all items correctly..
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

            // shipping option to use
            return `shopify-${shippingMethod.name.replace('%20', ' ')}-${shippingMethod.price}`
        })
        .catch((err) => {
            return null;
        });
    }
}
module.exports = Cart;