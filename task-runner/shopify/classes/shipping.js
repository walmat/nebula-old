/**
 * Parse includes
 */
const cheerio = require('cheerio');
const fs = require('fs');

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
    request,
} = require('./utils');

const now = require('performance-now');

class Shipping {
    constructor(context, timer, checkoutUrl, authToken, shippingMethod) {
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
        this._task = this._context.task;
        this._proxy = this._context.proxy;
        this._aborted = this._context.aborted;
        this._timer = timer;

        this._checkoutUrl = checkoutUrl;
        this._authToken = authToken;
        this._shippingMethod = shippingMethod;
        this._captchaResponse = '';
    }

    getShippingOptions() {
        if (this._aborted) {
            console.log('[INFO]: SHIPPING: Abort detected, aborting...');
            return -1;
        }

        this._timer.start(now());

        return request({
            uri: `${this._checkoutUrl}`,
            method: 'get',
            proxy: formatProxy(this._proxy),
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
            transform: function(body) {
                return cheerio.load(body);
            }
        })
        .then(($) => {

            // TODO - captcha solving

            const newAuthToken = $('form.edit_checkout input[name=authenticity_token]').attr('value');
            return request({
                uri: `${this._checkoutUrl}`,
                method: 'post',
                proxy: formatProxy(this._proxy),
                followAllRedirects: true,
                resolveWithFullResponse: true,
                simple: false,
                headers: {
                    Origin: `${this._task.site.url}`,
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': userAgent,
                    Referer: `${this._checkoutUrl}`,
                },
                formData: buildShippingForm(this._task, newAuthToken, '', 'shipping_method', 'contact_information'),
                transform: function(body) {
                    return cheerio.load(body);
                }
            })
            .then(($) => {
                const shippingPollUrl = $('div[data-poll-refresh="[data-step=shipping_method]"]').attr('data-poll-target');
                this._timer.stop(now());
                console.log(`[INFO]: SHIPPING: Got shipping options in ${this._timer.getRunTime()}ms`);
                if (shippingPollUrl === undefined) {
                    const firstShippingOption = $('div.content-box__row .radio-wrapper').attr('data-shipping-method');
                    if (firstShippingOption == undefined) {
                        console.log(`${this._task.site.url} is Incompatible, sorry for the inconvenience.`);
                        return null;
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
            
        });
    }

    submitShipping(type, value, authToken) {
        if (this._aborted) {
            console.log('[INFO]: SHIPPING: Abort detected, aborting...');
            return -1;
        }

        this._timer.start(now());

        if (type === 'poll') {
            setTimeout(() => {
                return request({
                    uri: this._checkoutUrl + value,
                    followAllRedirects: true,
                    resolveWithFullResponse: true,
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
                    return request({
                        uri: this._checkoutUrl,
                        followAllRedirects: true,
                        resolveWithFullResponse: true,
                        method: 'post',
                        headers: {
                            'User-Agent': userAgent,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        formData: {
                            utf8: '✓',
                            _method: 'patch',
                            authenticity_token: authToken,
                            button: '',
                            previous_step: 'shipping_method',
                            step: 'payment_method',
                            'checkout[shipping_rate][id]': shippingMethod,
                        },
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
                    }); 
                });
            }, parseInt(this._task.shippingPoll));
        } else if (type === 'direct') {
            
            return request({
                uri: this._checkoutUrl,
                followAllRedirects: true,
                resolveWithFullResponse: true,
                method: 'post',
                headers: {
                    'User-Agent': userAgent,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                formData: {
                    utf8: '✓',
                    _method: 'patch',
                    authenticity_token: authToken,
                    button: '',
                    previous_step: 'shipping_method',
                    step: 'payment_method',
                    'checkout[shipping_rate][id]': value,
                    'checkout[client_details][browser_width]': '1410',
                    'checkout[client_details][browser_height]': '781',
                    'checkout[client_details][javascript_enabled]': '1',
                    'secret': 'true',
                },
                transform: function(body) {
                    return cheerio.load(body);
                },
            })
            .then(() => {
                
                return request({
                    uri: `${this._checkoutUrl}?previous_step=shipping_method&step=payment_method`,
                    method: 'get',
                    followAllRedirects: true,
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
            })
        }
    }
}
module.exports = Shipping;