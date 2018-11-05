/**
 * Parse includes
 */
const cheerio = require('cheerio');
const fs = require('fs');

/**
 * Form includes
 */
const { buildShippingForm } = require('./utils/forms');

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
    constructor(context, timer, checkoutUrl, authToken, price) {
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
    }

    submit() {
        if (this._aborted) {
            console.log('[INFO]: SHIPPING: Abort detected, aborting...');
            return -1;
        }

        this._timer.start(now());

        return request({
            uri: `${this._checkoutUrl.split('?')[0]}`,
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
            // TODO - see if captcha is present and emit the request to solve it

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
                formData: buildShippingForm(this._task, this._authToken, '', 'shipping_method', 'contact_information'),
                transform: function(body) {
                    return cheerio.load(body);
                }
            })
            .then(($) => {
                this._timer.stop(now());
                console.log(`[INFO]: SHIPPING: Submitted shipping in ${this._timer.getRunTime()}ms`)
                return {
                    authToken: $('form.edit_checkout input[name=authenticity_token]').attr('value')
                };
            });
        })
    }
}
module.exports = Shipping;