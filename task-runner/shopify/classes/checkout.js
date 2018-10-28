/**
 * Parse includes
 */
const $ = require('cheerio');
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

/**
 * Local class includes
 */
const Cart = require('./cart');
const { States } = require('../taskRunner');
/**
 * Utils includes
 */
const {
    formatProxy,
    userAgent,
} = require('./utils');
const buildForm = require('./utils/buildForm');
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

    }

    autoParse(body, response, resolveWithFullResponse) {
        // FIXME: The content type string could contain additional values like the charset.
        // Consider using the `content-type` library for a robust comparison.
        if (response.headers['content-type'] === 'application/json') {
            return JSON.parse(body);
        } else if (response.headers['content-type'] === 'text/html') {
            return $.load(body);
        } else {
            return body;
        }
    }

    /**
     * Gets the checkout session data for the product(s) in the cart
     */
    getCheckoutData() {
        if (this._context.aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }

        return rp({
            uri: `${this._task.site.url}/cart.js`,
            followAllRedirects: true, // not working properly.
            resolveWithFullResponse: true,
            gzip: true,
            simple: true,
            proxy: formatProxy(this._proxy),
            method: 'post',
            headers: {
                'User-Agent': userAgent,
            },
        })
        .then((res) => {
            /**
             * should either be:
             * https://www.blendsus.com/1529745/checkouts/d3ea3db83f6ff42b5a7dcfa500aab827
             * or
             * https://www.blendsus.com/1529745/checkouts/d3ea3db83f6ff42b5a7dcfa500aab827/stock_problems
             */
            // break early if out of stock already...
            if (res.request.uri.href.indexOf('stock_problems') > -1) {
                console.log('[ERROR]: CHECKOUT: Size out of Stock...');
                if (this._task.sizes.length > 1) {
                    console.log('[DEBUG]: CHECKOUT: Changing to next size...');
                    return States.SwapSizes;
                }
                console.log('[DEBUG]: CHECKOUT: Running for restocks...');
                return States.Restock;
            } else {
                return {
                    checkoutHost: `https://${res.request.uri.host}`,
                    checkoutUrl: res.request.href,
                    checkoutId: res.request.href.split('checkouts/')[1],
                    storeId: res.request.href.split('/')[3],
                    authToken: $('form.edit_checkout input[name=authenticity_token]').attr('value'),
                    price: $('#checkout_total_price').text(),
                };
            }
        })
        .catch((err) => {
            console.log(err);
            console.log(`[ERROR]: CHECKOUT: Error while requesting checkout data...`);
            // TODO - error handling
            return null;
        });
    }

    inputShipping(checkoutHost, checkoutUrl, authToken) {
        if (this._context.aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }

        let form;
        if (checkoutUrl.indexOf('checkout.shopify.com') > -1) {
            form = buildForm(
                this._task,
                true,
                authToken,
                'shippingInput',
                'shipping_method',
                'contact_information'
            );
        } else {
            form = buildForm(
                this._task,
                true,
                authToken,
                'shippingInput',
                'contact_information',
                'contact_information'
            );
        }

        rp({
            method: 'GET',
            uri: checkoutUrl,
            proxy: formatProxy(this._proxy),
            followAllRedirects: true,
            headers: {
                Origin: `${checkoutHost}`,
                'User-Agent': userAgent,
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: `${checkoutHost}/`,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            qs: form,
            transform2xxOnly: true,
            transform: this.autoParse,
        })
        .then(($) => {
            return {
                authToken: $('form.edit_checkout input[name=authenticity_token]').attr('value'),
            }
        })
        .catch((err) => {
            console.log('[ERROR]: CHECKOUT: Unable to fill in shipping information...');
            return null;
        });
    }

    requestShipping(checkoutHost, checkoutUrl, checkoutId, storeId, authToken) {
        let form;

        if (checkoutUrl.indexOf('checkout.shopify.com') > -1) {
            form = buildForm(
                this._task,
                true,
                authToken,
                'shippingRequest',
                'shipping_method',
                'contact_information'
            );
        } else {
            form = buildForm(
                this._task,
                false,
                authToken,
                'shippingRequest',
                'shipping_method',
                'contact_information'
            );
        }

        rp({
            uri: checkoutUrl,
            followAllRedirects: true,
            proxy: formatProxy(this._proxy),
            method: 'post',
            headers: {
                Origin: `${checkoutHost}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.8',
                Referer: `${checkoutHost}/${storeId}/checkout/${checkoutId}`,
                'User-Agent': userAgent,
            },
            form: form,
        })
        .then((body) => {
            const $ = cheerio.load(body);
            const shippingPollUrl = $('div[data-poll-refresh="[data-step=shipping_method]"]').attr('data-poll-target');
            if (shippingPollUrl === undefined) {
                const firstShippingOption = $('div.content-box__row .radio-wrapper').attr('data-shipping-method');
                console.log(`Shipping method: ${firstShippingOption}`);
                if (firstShippingOption === undefined) {
                    console.log(`Unable to find checkout option for ${checkoutUrl}`);
                    process.exit(1);
                } else {
                    return {
                        type: 'direct',
                        value: firstShippingOption,
                        authToken: $('input[name="authenticity_token"]').val(),
                    };
                }
            }
            return {
                type: 'poll',
                value: shippingPollUrl,
            };
        })
        .catch((err) => {
            return null;
        });
    }

    pollForShipping(res, checkoutHost, checkoutUrl) {
        rp({
            uri: `${checkoutHost}${res.value}`,
            method: 'GET',
            proxy: formatProxy(this._proxy),
            headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'User-Agent': userAgent,
            },
        })
        .then((body) => {
            const $ = cheerio.load(body);
            return {
                shippingMethod: $('.radio-wrapper').attr('data-shipping-method'),
                authToken: $('form[data-shipping-method-form="true"] input[name="authenticity_token"]').attr('value'),
            }
        })
        .then((data) => {
            return rp({
                uri: checkoutUrl,
                followAllRedirects: true,
                proxy: formatProxy(this._proxy),
                method: 'POST',
                headers: {
                    'User-Agent': userAgent,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                formData: buildForm(
                    null,
                    null,
                    data.authToken,
                    'submitShipping',
                    'payment_method',
                    data.shippingMethod,
                )
            });
        })
        .then((body) => {
            const $ = cheerio.load(body);
            return {
                price: $('input[name="checkout[total_price]"]').attr('value'),
                gateway: $('input[name="checkout[payment_gateway]"]').attr('value'),
                authToken: $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value'),
            };
        })
        .catch((err) => {
            // todo - error polling for shipping..
        })
    }

    submitShipping(res, checkoutHost, checkoutUrl) {
        if (res.type === 'poll') {
            console.log(`Shipping Poll URL: ${checkoutHost}${res.value}`);
            // TODO - handle this case better...
            setTimeout(async () => {
                await this.pollForShipping(res, checkoutHost, checkoutUrl);
            }, parseInt(this._task.shippingPollTimeout));
        } else if (res.type === 'direct') {
            console.log(`Shipping Method Value: ${res.value}`);
            console.log('Card information sending...');
    
            rp({
                uri: checkoutUrl,
                followAllRedirects: true,
                proxy: formatProxy(this._proxy),
                method: 'POST',
                headers: {
                    'User-Agent': userAgent,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                formData: buildForm(
                    this._task,
                    null,
                    res.authToken,
                    'submitShipping',
                    'payment_method',
                    'shipping_method',
                    res.value,
                    null,
                    null,
                    null,
                ),
            })
            .then((body) => {
                const $ = cheerio.load(body);
                return {
                    paymentGateway: $('input[name="checkout[payment_gateway]"]').attr('value'),
                    authToken: $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value'),
                }
            })
            .catch((err) => {
                // error submitting payment
            });
        }
    }

    submitPayment() {
        const paymentInfo = buildForm(
            this._task,
            null,
            null,
            'payment',
            null,
            null,
            null,
        );

        rp({
            uri: `https://elb.deposit.shopifycs.com/sessions`,
            followAllRedirects: true,
            proxy: formatProxy(this._proxy),
            method: 'post',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentInfo),
        })
        .then((res) => {
            return {
                sessionValue: JSON.parse(res).id             
            }
        })
        .catch((err) => {
            // error creating payment session
        });
    }

    submitBilling(sValue, checkoutHost, checkoutUrl, storeId, checkoutId, authToken, paymentGateway, price) {
        rp({
            uri: checkoutUrl,
            followAllRedirects: true,
            proxy: formatProxy(this._proxy),
            method: 'post',
            headers: {
                Origin: checkoutHost,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.8',
                Referer: `${checkoutHost}/${storeId}/checkouts/${checkoutId}`,
                'User-Agent': userAgent,
            },
            formData: buildForm(
                this._task,
                null,
                authToken,
                'submitBilling',
                null,
                'payment_method',
                null,
                paymentGateway,
                price,
                sValue,
            ),
        })
        .then((body) => {
            const $ = cheerio.load(body);
            // TODO - handle this A LOT better...
            if ($('input[name="step"]').val() === 'processing' || $('title').text().indexOf('Processing') > -1) {
                return {
                    message: 'Payment is processing, go check your email for a confirmation.'
                };
            } else if ($('div.notice--warning p.notice__text')) {
                if ($('div.notice--warning p.notice__text') == '') {
                    return {
                        error: 'An unknown error has occurred please try again.'
                    };
                } else {
                    return {
                        error: `${$('div.notice--warning p.notice__text').eq(0).text()}`
                    };
                }
            } else {
                return {
                    error: 'An unknown error has occurred please try again.'
                };
            }
        })
    }

    async run () {
        // abort early if signaled
        if (this._context.aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }
        const start = now();
        // add to cart...
        let added = false;
        while (this.retries.ADD_TO_CART > 0) {
            try {
                added = await this._cart.addToCart();
                if (added) {
                    break;
                }
            } catch (errors) {
                console.log(`[DEBUG]: CHECKOUT: Add to cart errored out!\n${errors}`);
                console.log(`Retrying ${this.retries.ADD_TO_CART} more times before moving on..`);

                this.retries.ADD_TO_CART--;
            }
        }
        if (!added) {
            console.log('[ERROR]: CHECKOUT: Unable to add to cart...');
            return States.Aborted;
        }
        console.log(`Took ${(now()-start).toFixed(3)}ms to add to cart!`)

        // added! generate checkout URL
        let checkoutData = null;
        while (this.retries.CHECKOUT > 0) {
            try {
                checkoutData = await this.getCheckoutData();
                if (checkoutData) {
                    break;
                } else {
                    this.retries.CHECKOUT--;
                }
            } catch (errors) {
                console.log(`[DEBUG]: CHECKOUT: Unable to generate checkout URL\n${errors}`);
                this.retries.CHECKOUT--;
            }
        }
        if (!checkoutData) {
            console.log('[ERROR]: CHECKOUT: Unable to find checkout URL...');
            return States.Aborted;
        }
        console.log(checkoutData);
        // got checkout data, proceed to filling out shipping information
        let newAuthToken = null;
        try {
            newAuthToken = await this.inputShipping(checkoutData.checkoutHost, checkoutData.checkoutUrl, checkoutData.checkoutId, checkoutData.storeId, checkoutData.authToken, checkoutData.price);
        } catch (errors) {
            console.log(`[ERROR]: CHECKOUT: Unable to proceed to shipping...\n${errors}`);
            // TODO - error handling here..
            return States.Aborted;
        }

        if (!newAuthToken) {
            console.log(`[ERROR]: CHECKOUT: Unable to complete shipping information...\n`);
            return States.Aborted;
        }

        // shipping information completed, proceed to the next step: shipping method
        let shippingMethod = null;
        try {
            shippingMethod = await this.requestShipping(checkoutData.checkoutHost, checkoutData.checkoutUrl, checkoutData.checkoutId, checkoutData.storeId, newAuthToken.authToken, checkoutData.price);
        } catch (errors) {
            console.log(`[ERROR]: CHECKOUT: Error parsing to find shipping method...\n${errors}`);
            // TODO - error handling here..
            return States.Aborted;
        }

        if (!shippingMethod) {
            console.log(`[ERROR]: CHECKOUT: Unable to find shipping method...\n`);
            return States.Aborted;
        }
        // shipping method found, let's proceed to payment
        let paymentData = null;
        try {
            paymentData = await this.submitShipping(shippingMethod, checkoutData.checkoutHost, checkoutData.checkoutUrl)
        } catch (errors) {
            console.log(`[ERROR]: CHECKOUT: Error submitting payment information...\n${errors}`);
            return States.Aborted;
        }

        if (!paymentData) {
            console.log(`[ERROR]: CHECKOUT: Unable to find payment information...\n`);
            return States.Aborted;
        }

        let didSubmitPayment = null;
        try {
            didSubmitPayment = await this.submitPayment();
        } catch (errors) {
            console.log(`[ERROR]: CHECKOUT: Unable to submit payment information...\n${errors}`);
            return States.Aborted;
        }

        if (!didSubmitPayment) {
            console.log(`[ERROR]: CHECKOUT: Unable to submit payment information...\n`);
            return States.Aborted;
        }
        let didCheckout = null;

        while (this.retries.CHECKOUT > 0 || didCheckout.message)
            try {
                didCheckout = 
                    await this.submitBilling(
                        didSubmitPayment.sessionValue,
                        checkoutData.checkoutHost,
                        checkoutData.checkoutUrl,
                        checkoutData.checkoutId,
                        paymentData.paymentGateway,
                        paymentData.price
                    );
                if (didCheckout.message) {
                    break;
                } else {
                    console.log(`[ERROR]: CHECKOUT: Unable to successfully checkout...\n${didCheckout.error}`);
                    this.retries.CHECKOUT--;
                }
            } catch (errors) {
                console.log(`[ERROR]: CHECKOUT: Unable to successfully checkout...\n${errors}`);
                this.retries.CHECKOUT--;
            }

        if (!didCheckout.message) {
            console.log(`[ERROR]: CHECKOUT: Unable to successfully checkout...\n`);
            return States.Restock;
        } else {
            console.log(`[INFO]: CHECKOUT: Successfully checkout out!...\n`);
            /**
             * TODO - call Notification Module to send discord/slack webhook
             * a rich embed with the successful checkout information.
             */
            return States.Aborted; // temporary stop after first size..
        }
    }
}

module.exports = Checkout;