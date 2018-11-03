/**
 * Parse includes
 */
const cheerio = require('cheerio');
const fs = require('fs');
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

/**
 * Local class includes
 */
const Cart = require('./cart');
const Timer = require('./timer');
const { States } = require('../taskRunner');
/**
 * Utils includes
 */
const {
    formatProxy,
    userAgent,
} = require('./utils');
const {
    buildShippingForm,
    buildPaymentForm,
} = require('./utils/forms');
const now = require('performance-now');

class Checkout {

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
         * Add to cart module for handling adding a product to cart.
         */
        this._cart = new Cart(context);

        this.retries = {
            ADD_TO_CART: 5,
            CHECKOUT: 5,
        };

        /**
         * ID of the given task runner
         */
        this._id = this._context.runner_id;

         /**
         * Task Data for the running task
         * @type {TaskObject}
         */
        this._task = this._context.task;

        /**
         * Proxy to run the task with
         * @type {String}
         */
        this._proxy = this._context.proxy;

        /**
         * Price for the product
         * @type {String}
         */
        this._aborted = this._context.aborted;

        this._timer = new Timer();

    }

    login() {
        rp({
            uri: `${this._task.site.url}/account/login`,
            method: 'post',
            proxy: formatProxy(this._proxy),
            followAllRedirects: true,
            resolveWithFullResponse: true,
            rejectUnauthorized: false,
            gzip: true,
            simple: false,
            headers: {
                'User-Agent': userAgent,
            },
            formData: {
                'customer[email]': this._task.username,
                'customer[password]': this._task.password,
            }
        })
        .then((res) => {
            if (res.statusCode === 200) {
                return true;
            } else {
                return false;
            }
        })
    }

    /**
     * Fills and submits the shipping information for the customer
     * @param {String} checkoutHost - the host of the checkout process
     * @param {String} checkoutUrl - the checkout url in which to send the request
     * @param {String} checkoutId - the hash checkout id after checkouts/
     * @param {String} storeId - the 7-digit store id before the /checkouts
     * @param {String} authToken - the forms authentication token to pass through the process
     * @return {String} authentication token to use for the next step
     */
    submitShippingDetails(checkoutHost, checkoutUrl, authToken) {
        if (this._context.aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }

        return rp({
            uri: checkoutUrl,
            method: 'get',
            proxy: formatProxy(this._proxy),
            followAllRedirects: true,
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            gzip: true,
            simple: false,
            headers: {
                Origin: `${checkoutHost}`,
                'User-Agent': userAgent,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: `${checkoutHost}/`,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            qs: buildShippingForm(this._task, authToken, ''),
        })
        .then((res) => {

            fs.writeFileSync('debug_submitShippingDetailsGet.html', res.body);
            // TODO - find if captcha is present and emit the proper event
            return rp({
                uri: checkoutUrl,
                method: 'post',
                proxy: formatProxy(this._proxy),
                followAllRedirects: true,
                rejectUnauthorized: false,
                resolveWithFullResponse: true,
                gzip: true,
                simple: false,
                headers: {
                    Origin: `${checkoutHost}`,
                    'User-Agent': userAgent,
                    Accept: 
                        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    Referer: `${checkoutUrl}`,
                    'Accept-Language': 'en-US,en;q=0.8',
                },
                formData: buildShippingForm(this._task, authToken, '')
            })
            .then((res) => {
                const $ = cheerio.load(res.body);

                fs.writeFileSync('debug_submit_shipping.html', res.body);
                console.log('---old auth token: ' + authToken);
                return $('form.edit_checkout input[name=authenticity_token]').attr('value');
            })
            .catch((err) => {
                console.log(err);
            })
        })
    }

    submitPaymentDetails(checkoutUrl, price, shippingValue, captchaResponse) {
        if (this._context.aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }

        return rp({
            uri: `${checkoutUrl}?step=payment_method`,
            proxy: formatProxy(this._proxy),
            method: 'get',
            followAllRedirects: true,
            rejectUnauthorized: false,
            simple: false,
            json: false,
            resolveWithFullResponse: true,
            headers: {
                'User-Agent': userAgent,
            }
        })
        .then((res) => {
            const $ = cheerio.load(res.body);
            const gateway = $('input[name="checkout[payment_gateway]"]').attr('value');
            const authToken = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');
        
            return rp({
                uri: checkoutUrl,
                method: 'post',
                proxy: formatProxy(this._proxy),
                followAllRedirects: true,
                rejectUnauthorized: false,
                resolveWithFullResponse: true,
                simple: false,
                json: false,
                headers: {
                    'User-Agent': userAgent,
                    'Content-Type': 'application/json',
                },
                formData: (buildPaymentForm(
                    this._task,
                    authToken,
                    'payment_method',
                    gateway,
                    price,
                    shippingValue,
                    captchaResponse,
                ))
            })
            .then((res) => {
                fs.writeFileSync('debug_submit_payment.html', res.body);
                const $ = cheerio.load(res.body);
                if ($('input[name="step"]').val() == 'processing') {
                    return {
                        message: 'Copped! Check your email.'
                    }
                } else {
                    return {
                        message: $('div.notice--warning p.notice__text').eq(0).text(),
                    }
                }
            })
            .catch((err) => {
                console.log(err);
            });
        })
        .catch((err) => {
            console.log(err);
        })
        
    }

    getPaymentToken() {
        const paymentInfo = {
            'credit_card': {
                'number': this._task.profile.payment.cardNumber,
                'verification_value': this._task.profile.payment.cvv,
                'name': `${this._task.profile.billing.firstName} ${this._task.profile.billing.lastName}`,
                'month': parseInt(this._task.profile.payment.exp.slice(0,2)),
                'year': parseInt(this._task.profile.payment.exp.slice(3,5)),
            }
        };

        return rp({
            uri: `https://elb.deposit.shopifycs.com/sessions`,
            followAllRedirects: true,
            rejectUnauthorized: false,
            proxy: formatProxy(this._proxy),
            method: 'post',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentInfo),
        })
        .then((res) => {
            return JSON.parse(res).id;
        })
        .catch((err) => {
            // error creating payment session
        });
    }

    async run () {
        // abort early if signaled
        if (this._context.aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }

        this._timer.start(now());

        // add to cart...
        let checkoutData = null;
        while (this.retries.ADD_TO_CART > 0) {
            try {
                checkoutData = await this._cart.addToCart();
                console.log(checkoutData);
                if (checkoutData === this._cart.CART_STATES.Queue) {
                    console.log(`[DEBUG]: CHECKOUT: Waiting in queue...!`);
                    // TODO
                } else if (checkoutData === this._cart.CART_STATES.OutOfStock) {
                    console.log(`[DEBUG]: CHECKOUT: Out of stock, swapping sizes!`);
                    // TODO
                } else if (checkoutData) {
                    break;
                }
                this.retries.ADD_TO_CART--;
            } catch (errors) {
                console.log(`[DEBUG]: CHECKOUT: Add to cart errored out!\n${errors}`);
                console.log(`Retrying ${this.retries.ADD_TO_CART} more times before moving on..`);
                this.retries.ADD_TO_CART--;
            }
        }

        if (!checkoutData) {
            console.log('[ERROR]: CHECKOUT: Unable to add to cart...');
            return States.Aborted;
        }

        this._timer.stop(now());
        console.log(`Took ${this._timer.getRunTime()}ms to add to cart!`)
        this._timer.start(now());

        let paymentToken = null;
        try {
            paymentToken = await this.getPaymentToken();
        } catch (errors) {
            console.log(errors);
        }
        
        if (!paymentToken) {
            console.log('[ERROR]: Unable to generate payment token');
            return States.Aborted;
        }

        console.log(`[DEBUG]: Using payment token ${paymentToken}`)

        // added! generate checkout URL
        let newAuthToken = null;
        try {
            newAuthToken = await this.submitShippingDetails(checkoutData.checkoutHost, checkoutData.checkoutUrl, checkoutData.authToken);
        } catch (errors) {
            console.log(`[ERROR]: CHECKOUT: Unable to proceed to shipping...\n${errors}`);
            // TODO - error handling here..
            return States.Aborted;
        }

        console.log('---');
        console.log(newAuthToken);
        console.log('---');

        if (!newAuthToken) {
            console.log(`[ERROR]: CHECKOUT: Unable to complete shipping information...\n`);
            return States.Aborted;
        }
        this._timer.stop(now());
        console.log(`Took ${this._timer.getRunTime()}ms to submit shipping details!`)
        this._timer.start(now());

        // find shipping rates available to the user
        let shippingMethod = await this._cart.getEstimatedShippingRates();
        console.log(`[DEBUG]: Using shipping method: ${shippingMethod}`);

        this._timer.stop(now());
        console.log(`Took ${this._timer.getRunTime()}ms to find shipping rates!`)
        this._timer.start(now());

        let newerAuthToken = null;
        try {
            newerAuthToken = await this.submitPaymentDetails(checkoutData.checkoutUrl, checkoutData.price, shippingMethod, '');
        } catch (errors) {
            console.log(errors);
        }
        console.log(newerAuthToken);

        this._timer.stop(now());
        console.log(`Took ${this._timer.getRunTime()}ms to submit payment!`)
        this._timer.start(now());

        console.log(`Took ${this._timer.getTotalTime()}ms to complete checkout`);

    }
}

module.exports = Checkout;