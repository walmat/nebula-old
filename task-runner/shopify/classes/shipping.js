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
const { buildShippingForm } = require('./utils/forms');

/**
 * Utils includes
 */
const {
    formatProxy,
    userAgent,
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

    /**
     * 
     * Charles Request QueryStrings::
     * 
     * https://www.blendsus.com/1529745/checkouts/d3ea3db83f6ff42b5a7dcfa500aab827
     * utf8=✓
     * _method=patch
     * authenticity_token=RxhEPB652gc6Y+7rJ38Lz1sbCZ1SzlNDSUETmNWGfQy1UK66ofGMDtO6XmufilzfMaQAnux93E6S2GcHzPtpMg==
     * previous_step=contact_information
     * checkout[email]=matthew.wallt@gmail.com
     * checkout[buyer_accepts_marketing]=0
     * checkout[buyer_accepts_marketing]=1
     * checkout[shipping_address][first_name]=
     * checkout[shipping_address][last_name]=
     * checkout[shipping_address][company]=
     * checkout[shipping_address][address1]=
     * checkout[shipping_address][address2]=
     * checkout[shipping_address][city]=
     * checkout[shipping_address][country]=
     * checkout[shipping_address][province]=
     * checkout[shipping_address][zip]=
     * checkout[shipping_address][phone]=
     * checkout[shipping_address][first_name]=this._task.profile.shipping.firstName
     * checkout[shipping_address][last_name]=this._task.profile.shipping.lastName
     * checkout[shipping_address][company]= ''
     * checkout[shipping_address][address1]=this._task.profile.shipping.address
     * checkout[shipping_address][address2]=this._task.profile.shipping.apt
     * checkout[shipping_address][city]=this._task.profile.shipping.city
     * checkout[shipping_address][country]=this._task.profile.shipping.country
     * checkout[shipping_address][province]=this._task.profile.shipping.state
     * checkout[shipping_address][zip]=this._task.profile.shipping.zipCode
     * checkout[shipping_address][phone]=this._task.profile.shipping.phone
     * step=contact_information
     */
    submit() {
        if (this._aborted) {
            console.log('[INFO]: SHIPPING: Abort detected, aborting...');
            return -1;
        }

        this._timer.start(now());
        return rp({
            uri: `${this._checkoutUrl}`,
            method: 'get',
            proxy: formatProxy(this._proxy),
            followAllRedirects: true,
            simple: false,
            headers: {
                Origin: `${this._task.site.url}`,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': userAgent,
                Referer: `${this._task.site.url}/cart`,
            },
            qs: buildShippingForm(this._task, this._authToken, ''),
        })
        .then((res) => {

            // TODO - see if captcha is present and emit the request to solve it

            return rp({
                uri: `${this._checkoutUrl}`,
                method: 'post',
                proxy: formatProxy(this._proxy),
                followAllRedirects: true,
                simple: false,
                headers: {
                    Origin: `${this._task.site.url}`,
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': userAgent,
                    Referer: `${this._checkoutUrl}`,
                },
                formData: buildShippingForm(this._task, this._authToken, ''),
                transform: function(body) {
                    return cheerio.load(body);
                }
            })
            .then(($) => {
                this._timer.stop(now());
                console.log(`[DEBUG]: SHIPPING: Submitted shipping in ${this._timer.getRunTime()}ms`)
                return {
                    authToken: $('form.edit_checkout input[name=authenticity_token]').attr('value')
                };
            });
        })
    }
}
module.exports = Shipping;