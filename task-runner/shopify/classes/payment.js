/**
 * Parse includes
 */
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
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
    request,
} = require('./utils');
const now = require('performance-now');

class Payment {

    constructor(context, timer, request, checkoutUrl, authToken, price, paymentGateway, paymentToken, shippingValue, captchaResponse) {
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
        this._price = price;
        this._paymentGateway = paymentGateway;
        this._paymentToken = paymentToken;
        this._shippingValue = shippingValue;
        this._captchaResponse = captchaResponse;

        this._task = this._context.task;
        this._proxy = this._context.proxy;
        this._aborted = this._context.aborted;


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

        this._timer.start(now());

        return request({
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
            transform: function(body) {
                return cheerio.load(body);
            }
        })
        .then(($) => {
            const gateway = $('input[name="checkout[payment_gateway]"]').attr('value');
            const authToken = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');
            
            return request({
                uri: `${this._checkoutUrl}`,
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
                    this._price,
                    gateway,
                    this._paymentToken,
                    this._shippingValue,
                    this._captchaResponse,
                ),
            })
            .then((res) => {
                const $ = cheerio.load(res.body);
                console.log(path.join(__dirname, 'debug.html'));
                fs.writeFileSync(path.join(__dirname, 'debug.html'), res.body);
                this._timer.stop(now());
                console.log(`[INFO]: PAYMENT: Submitted payment in ${this._timer.getRunTime()}ms`)
                
                if ($('input[name="step"]').val() == 'processing') {
                    console.log('[INFO]: PAYMENT: Payment is processing, go check your email for a confirmation.');
                    return this.PAYMENT_STATES.Processing;
                } else if ($('title').text().indexOf('Processing') > -1) {
                    console.log('[INFO]: PAYMENT: Payment is processing, go check your email for a confirmation.');
                    return this.PAYMENT_STATES.Processing;
                } else if (res.request.href.indexOf('paypal.com') > -1) {
                    const open = require('open');
                    console.log('[INFO]: PAYMENT: This website only supports PayPal');
                    open(res.request.href);
                    return this.PAYMENT_STATES.Success;
                } else if ($('div.notice--warning p.notice__text')) {
                    if ($('div.notice--warning p.notice__text') == '') {
                      console.log(`[INFO]: PAYMENT: An unknown error has occured please try again.`);
                        return this.PAYMENT_STATES.Error;
                    } else {
                      console.log(`[INFO]: PAYMENT: ${$('div.notice--warning p.notice__text').eq(0).text()}`);
                      return this.PAYMENT_STATES.Error;
                    }
                } else {
                    console.log(`[INFO]: PAYMENT: An unknown error has occured please try again.`);
                    return this.PAYMENT_STATES.Error;
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
        })
    }
}
module.exports = Payment;