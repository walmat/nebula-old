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
        this._logger = this._context.logger;

        this._captchaResponse = '';
    }

    getShippingOptions() {
        this._timer.start(now());
        this._logger.verbose('SHIPPING: Starting Get Shipping Options Form request...');
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
<<<<<<< HEAD
        .then(($) => {
=======
        .then((res) => {
            const $ = cheerio.load(res.body);
            fs.writeFileSync(path.join(__dirname, 'debug-1.html'), res.body);
>>>>>>> task runner messages updates
            const recaptchaFrame = $('#g-recaptcha');
            const newAuthToken = $('form.edit_checkout input[name=authenticity_token]').attr('value');
            this._logger.verbose('SHIPPING: Finished Getting Shipping Options Form');

            if (recaptchaFrame.length) {
                this._logger.debug('SHIPPING: Captcha Found in Shipping Form');
                return {
                    captcha: recaptchaFrame,
                    newAuthToken,
                }
            } else {
                return {
                    newAuthToken,
                };
            }
        })
        .catch((err) => {
            this._logger.debug('SHIPPING: Get Shipping Options Form request error: %s', err);
            return {
                errors: err,
            }
        });
    }

    submitShippingOptions(newAuthToken, captchaResponse) {
        this._logger.verbose('SHIPPING: Starting submit shipping options request...');
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
            formData: buildShippingForm(this._task, newAuthToken, captchaResponse || '', 'shipping_method', 'contact_information'),
            // transform: function(body) {
            //     return cheerio.load(body);
            // }
        })
        .then((res) => {
            const $ = cheerio.load(res.body);
            const shippingPollUrl = $('div[data-poll-refresh="[data-step=shipping_method]"]').attr('data-poll-target');
            this._timer.stop(now());
<<<<<<< HEAD
            this._logger.info('Submitted shipping options in %d ms', this._timer.getRunTime());
            if (shippingPollUrl === undefined) {
                const firstShippingOption = $('div.content-box__row .radio-wrapper').attr('data-shipping-method');
                if (firstShippingOption == undefined) {
                    this._logger.info('%s is incompatible, sorry for the inconvenience', this._task.site.url);
=======

            fs.writeFileSync(path.join(__dirname, 'debug.html'), res.body);
    
            if (shippingPollUrl === undefined) {
                const firstShippingOption = $('div.content-box__row .radio-wrapper').attr('data-shipping-method');
                if (firstShippingOption == undefined) {
>>>>>>> task runner messages updates
                    return {
                        errors: `Unable to find shipping options`,
                    };
                } else {
<<<<<<< HEAD
                    this._logger.debug('SHIPPING: Direct Shipping Method Chosen');
=======
                    this._timer.stop(now());
                    console.log(`[INFO]: SHIPPING: Got shipping options in ${this._timer.getRunTime()}ms`);
>>>>>>> task runner messages updates
                    return {
                        type: 'direct',
                        value: firstShippingOption,
                        authToken: $('input[name="authenticity_token"]').val()
                    };
                }
            }
<<<<<<< HEAD
            this._logger.debug('SHIPPING: Poll Shipping Method Chosen');
=======
>>>>>>> task runner messages updates
            return {
                type: 'poll',
                value: shippingPollUrl,
                authToken: '',
            }
        })
        .catch((err) => {
            this._logger.debug('Error submitting shipping options: %s', err);
            return {
                errors: 'Error posting shipping',
            }
        })
    }

    async submitShipping(type, value, authToken) {
        this._timer.start(now());
        this._logger.verbose('Submitting Shipping Details...');
        if (type === 'poll') {
            await new Promise((resolve) => setTimeout(resolve, parseInt(this._task.shippingPoll)));
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
            })
            .then(($) => {
                const price = $('input[name="checkout[total_price]"]').attr('value');
                const paymentGateway = $('input[name="checkout[payment_gateway]"]').attr('value');
                const newAuthToken = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');
        
                this._timer.stop(now());
                this._logger.info('Submitted Shipping in %d ms', this._timer.getRunTime());
                return {
                    price,
                    paymentGateway,
                    newAuthToken,
                };
            })
            .catch((err) => {
                this._logger.debug('Error Submitting Shipping: %s', err);
                return {
                    errors: err,
                }
            });
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
            })
            .then(($) => {
                const price = $('input[name="checkout[total_price]"]').attr('value');
                const paymentGateway = $('input[name="checkout[payment_gateway]"]').attr('value');
                const newAuthToken = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');
                
                this._timer.stop(now());
                this._logger.info('Submitted Shipping in %d ms', this._timer.getRunTime());
                return {
                    price,
                    paymentGateway,
                    newAuthToken,
                };
            })
            .catch((err) => {
                this._logger.debug('Error Submitting Shipping: %s', err);
                return {
                    errors: err,
                }
            });
        }
    }
}
module.exports = Shipping;