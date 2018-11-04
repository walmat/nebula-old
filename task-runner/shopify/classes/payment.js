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
const { buildPaymentForm } = require('./utils/forms');

/**
 * Utils includes
 */
const {
    formatProxy,
    userAgent,
} = require('./utils');
const now = require('performance-now');

class Payment {
    constructor(context, timer, checkoutUrl, authToken, price, shippingValue, captchaResponse) {
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
        this._price = price;
        this._shippingValue = shippingValue;
        this._captchaResponse = captchaResponse;

        /**
         * STATES THAT THE PAYMENT MODULE CAN BE IN
         */
        this.PAYMENT_STATES = {
            Processing: 'PROCESSING',
            Error: 'PAYMENT_ERROR',
            Declined: 'DECLINED',
            Success: 'SUCCESS'
        }
    }

    submit() {
        if (this._aborted) {
            console.log('[INFO]: PAYMENT: Abort detected, aborting...');
            return -1;
        }

        this._timer.start(now());

        return rp({
            uri: `${this._checkoutUrl}?step=payment_method`,
            proxy: formatProxy(this._proxy),
            method: 'get',
            followAllRedirects: true,
            simple: false,
            json: false,
            resolveWithFullResponse: true,
            headers: {
                'User-Agent': userAgent,
            },
            transform2xxOnly: true,
            transform: function(body) {
                return cheerio.load(body);
            }
        })
        .then(($) => {
            const gateway = $('input[name="checkout[payment_gateway]"]').attr('value');
            const authToken = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');
        
            return rp({
                uri: this._checkoutUrl,
                method: 'post',
                proxy: formatProxy(this._proxy),
                followAllRedirects: true,
                resolveWithFullResponse: true,
                simple: false,
                json: false,
                headers: {
                    'User-Agent': userAgent,
                    'Content-Type': 'application/json',
                },
                formData: buildPaymentForm(
                    this._task,
                    authToken,
                    'payment_method',
                    gateway,
                    this._price,
                    this._shippingValue,
                    this._captchaResponse,
                ),
                transform: function(body) {
                    return cheerio.load(body);
                }
            })
            .then(($) => {
                this._timer.stop(now());
                console.log(`[DEBUG]: PAYMENT: Submitted payment in ${this._timer.getRunTime()}ms`)
                if ($('input[name="step"]').val() == 'processing') {
                    return this.PAYMENT_STATES.Processing;
                } else {
                    return this.PAYMENT_STATES.Error;
                }
            });
        });
    }
}
module.exports = Payment;