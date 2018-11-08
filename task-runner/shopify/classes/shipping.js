/**
 * Parse includes
 */
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

/**
 * Form includes
 */
const { buildShippingForm, buildShippingMethodForm } = require('./utils/forms');

/**
 * Utils includes
 */
const {
    formatProxy,
    userAgent,
} = require('./utils');

const now = require('performance-now');

class Shipping {
    constructor(context, timer, request, checkoutUrl, authToken, shippingMethod) {
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
        this._checkoutUrl = checkoutUrl;
        this._authToken = authToken;
        this._shippingMethod = shippingMethod;

        this._task = this._context.task;
        this._proxy = this._context.proxy;
        this._aborted = this._context.aborted;

        this._captchaResponse = '';
    }

    getShippingOptions() {

        this._timer.start(now());

        console.log(this._checkoutUrl);

        return this._request({
            uri: `${this._checkoutUrl}`,
            method: 'get',
            proxy: formatProxy(this._proxy),
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            followAllRedirects: true,
            simple: false,
            headers: {
                Origin: `${this._task.site.url}`,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': userAgent,
                Referer: `${this._task.site.url}/cart`,
            },
            qs: buildShippingForm(this._task, this._authToken, '', 'contact_information', 'contact_information'),
            // transform: function(body) {
            //     return cheerio.load(body);
            // }
        })
        .then((res) => {
            const $ = cheerio.load(res.body);

            // TODO - captcha solving
            console.log(this._checkoutUrl, res.request.href);

            const newAuthToken = $('form.edit_checkout input[name=authenticity_token]').attr('value');
            console.log(newAuthToken);
            return this._request({
                uri: `${this._checkoutUrl}`,
                method: 'post',
                proxy: formatProxy(this._proxy),
                rejectUnauthorized: false,
                followAllRedirects: true,
                resolveWithFullResponse: true,
                simple: false,
                headers: {
                    Origin: `${this._task.site.url}`,
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': userAgent,
                    Referer: `${this._checkoutUrl}`,
                },
                formData: JSON.stringify(buildShippingForm(this._task, newAuthToken, '', 'shipping_method', 'contact_information')),
                // transform: function(body) {
                //     return cheerio.load(body);
                // }
            })
            .then((res) => {
                const $ = cheerio.load(res.body);
                const shippingPollUrl = $('div[data-poll-refresh="[data-step=shipping_method]"]').attr('data-poll-target');
                fs.writeFileSync(path.join(__dirname, `${this._context.id}-checkout-2-cookies.txt`), this._request.jar().getCookies(this._checkoutUrl));

                this._timer.stop(now());
                console.log(`[INFO]: SHIPPING: Got shipping options in ${this._timer.getRunTime()}ms`);
                if (shippingPollUrl === undefined) {
                    const firstShippingOption = $('div.content-box__row .radio-wrapper').attr('data-shipping-method');
                    if (firstShippingOption == undefined) {
                        console.log(`${this._task.site.url} is Incompatible, sorry for the inconvenience.`);
                        return {
                            errors: `Site is incompatible.`,
                        };
                    } else {
                        return {
                            type: 'direct',
                            value: firstShippingOption,
                            authToken: $('input[name="authenticity_token"]').val()
                        };
                    }
                }
                return {
                    type: 'poll',
                    value: shippingPollUrl,
                    authToken: '',
                }
            })
            .catch((err) => {
                return {
                    errors: err,
                }
            })
            
        })
        .catch((err) => {
            return {
                errors: err,
            }
        });
    }

    submitShipping(type, value, authToken) {

        this._timer.start(now());

        if (type === 'poll') {
            setTimeout(() => {
                return this._request({
                    uri: this._checkoutUrl + value,
                    followAllRedirects: true,
                    resolveWithFullResponse: true,
                    proxy: formatProxy(this._proxy),
                    rejectUnauthorized: false,
                    simple: false,
                    method: 'get',
                    headers: {
                        Accept:
                        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'User-Agent': userAgent,
                    },
                    transform: function(body) {
                        return cheerio.load(body);
                    }
                })
                .then(($) => {
                    const shippingMethod = $('.radio-wrapper').attr('data-shipping-method');
                    const authToken = $('form[data-shipping-method-form="true"] input[name="authenticity_token"]').attr('value');
                    return this._request({
                        uri: this._checkoutUrl,
                        followAllRedirects: true,
                        resolveWithFullResponse: true,
                        proxy: formatProxy(this._proxy),
                        rejectUnauthorized: false,
                        method: 'post',
                        headers: {
                            'User-Agent': userAgent,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        formData: buildShippingMethodForm(authToken, shippingMethod),
                        transform: function(body) {
                            return cheerio.load(body);
                        }
                    })
                    .then(($) => {
                        const price = $('input[name="checkout[total_price]"]').attr('value');
                        const paymentGateway = $('input[name="checkout[payment_gateway]"]').attr('value');
                        const newAuthToken = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');
                
                        this._timer.stop(now());
                        console.log(`[INFO]: SHIPPING: Submitted shipping in ${this._timer.getRunTime()}ms`);
                
                        return {
                            price,
                            paymentGateway,
                            newAuthToken,
                        };
                    })
                    .catch((err) => {
                        return {
                            errors: err,
                        }
                    })
                })
                .catch((err) => {
                    return {
                        errors: err,
                    }
                })
            }, parseInt(this._task.shippingPoll));
        } else if (type === 'direct') {
            
            return this._request({
                uri: this._checkoutUrl,
                followAllRedirects: true,
                resolveWithFullResponse: true,
                proxy: formatProxy(this._proxy),
                rejectUnauthorized: false,
                method: 'post',
                headers: {
                    'User-Agent': userAgent,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                formData: buildShippingMethodForm(authToken, value),
                transform: function(body) {
                    return cheerio.load(body);
                },
            })
            .then(() => {
                
                return this._request({
                    uri: `${this._checkoutUrl}?previous_step=shipping_method&step=payment_method`,
                    method: 'get',
                    followAllRedirects: true,
                    proxy: formatProxy(this._proxy),
                    rejectUnauthorized: false,
                    headers: {
                        'User-Agent': userAgent,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    transform: function(body) {
                        return cheerio.load(body);
                    }
                })
                .then(($) => {
                    const price = $('input[name="checkout[total_price]"]').attr('value');
                    const paymentGateway = $('input[name="checkout[payment_gateway]"]').attr('value');
                    const newAuthToken = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');

                    return {
                        price,
                        paymentGateway,
                        newAuthToken,
                    };
                })
                .catch((err) => {
                    return {
                        errors: err,
                    }
                })
            })
            .catch((err) => {
                return {
                    errors: err,
                }
            });
        }
    }
}
module.exports = Shipping;