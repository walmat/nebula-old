const cheerio = require('cheerio');
const phoneFormatter = require('phone-formatter');
const now = require("performance-now");
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

const AddToCart = require('./addToCart');

const {
    formatProxy,
    userAgent,
} = require('./utils');

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
        this._addToCart = new AddToCart(this._context);

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

    getCheckoutData() {
        if (this._context.aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }
        rp({
            uri: `${this._task.site.url}/cart.js`,
            followAllRedirects: true,
            resolveWithFullResponse: true,
            method: 'post',
            headers: {
                'User-Agent': userAgent,
            },
            formData: {
                quantity: '1',
                checkout: 'Checkout',
            },
        })
        .then((res) => {
            // break early if out of stock already...
            if (res.request.href.indexOf('stock_problems') > -1) {
                console.log('[ERROR]: CHECKOUT: Out of Stock...');
                return States.Restock;
            } else {
                console.log(`DEBUG]: CHECKOUT: body=${res.body}`)
                return {
                    checkoutHost: `https://${res.request.originalHost}`,
                    checkoutUrl: res.request.href,
                    checkoutId: res.request.href.split('checkouts/')[1],
                    storeId: res.request.href.split('/')[3],
                    authToken: $('form.edit_checkout input[name=authenticity_token]').attr('value'),
                    price: $('#checkout_total_price').text(),
                };
            }
        })
        .catch((err) => {
            console.log(`[ERROR]: CHECKOUT: Error: ${err} while proceeding to checking...`);
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
            form = {
                utf8: '✓',
                _method: 'patch',
                authenticity_token: authToken,
                previous_step: 'contact_information',
                step: 'shipping_method',
                'checkout[email]': this._task.payment.email,
                'checkout[buyer_accepts_marketing]': '1',
                'checkout[shipping_address][first_name]': this._task.profile.shipping.firstName,
                'checkout[shipping_address][last_name]': this._task.profile.shipping.lastName,
                'checkout[shipping_address][company]': '',
                'checkout[shipping_address][address1]': this._task.profile.shipping.address,
                'checkout[shipping_address][address2]': this._task.profile.shipping.apt,
                'checkout[shipping_address][city]': this._task.profile.shipping.city,
                'checkout[shipping_address][country]': this._task.profile.shipping.country,
                'checkout[shipping_address][province]': this._task.profile.shipping.state,
                'checkout[shipping_address][zip]': this._task.profile.shipping.zipCode,
                'checkout[shipping_address][phone]': this._task.profile.shipping.phone,
                'checkout[remember_me]': '0',
                button: '',
                'checkout[client_details][browser_width]': '979',
                'checkout[client_details][browser_height]': '631',
            };
        } else {
            form = {
                utf8: '✓',
                _method: 'patch',
                authenticity_token: authToken,
                previous_step: 'contact_information',
                'checkout[email]': this._task.profile.payment.email,
                'checkout[shipping_address][first_name]': this._task.profile.shipping.firstName,
                'checkout[shipping_address][last_name]': this._task.profile.shipping.lastName,
                'checkout[shipping_address][company]': '',
                'checkout[shipping_address][address1]': this._task.profile.shipping.address,
                'checkout[shipping_address][address2]': this._task.profile.shipping.apt,
                'checkout[shipping_address][city]': this._task.profile.shipping.city,
                'checkout[shipping_address][country]': this._task.profile.shipping.country,
                'checkout[shipping_address][province]': this._task.profile.shipping.state,
                'checkout[shipping_address][zip]': this._task.profile.shipping.zipCode,
                'checkout[shipping_address][phone]': this._task.profile.shipping.phone,
                'checkout[remember_me]': '0',
                'checkout[client_details][browser_width]': '979',
                'checkout[client_details][browser_height]': '631',
                'checkout[client_details][javascript_enabled]': '1',
                step: 'contact_information',
            };
        }

        rp({
            method: 'GET',
            uri: checkoutUrl,
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
        })
        .then((body) => {
            const $ = cheerio.load(body);
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
            form = {
                _method: 'patch',
                authenticity_token: authToken,
                button: '',
                'checkout[client_details][browser_width]': '979',
                'checkout[client_details][browser_height]': '631',
                'checkout[client_details][javascript_enabled]': '1',
                'checkout[email]': this._task.profile.payment.email,
                'checkout[shipping_address][address1]': this._task.profile.shipping.address,
                'checkout[shipping_address][address2]': this._task.profile.shipping.apt,
                'checkout[shipping_address][city]': this._task.profile.shipping.city,
                'checkout[shipping_address][country]': this._task.profile.shipping.country,
                'checkout[shipping_address][first_name]': this._task.profile.shipping.firstName,
                'checkout[shipping_address][last_name]': this._task.profile.shipping.lastName,
                'checkout[shipping_address][phone]': this._task.profile.shipping.phone,
                'checkout[shipping_address][province]': this._task.profile.shipping.state,
                'checkout[shipping_address][zip]': this._task.profile.shipping.zipCode,
                previous_step: 'contact_information',
                remember_me: 'false',
                step: 'shipping_method',
                utf8: '✓',
            };
        } else {
            form = {
                utf8: '✓',
                _method: 'patch',
                authenticity_token: authToken,
                button: '',
                'checkout[email]': this._task.profile.payment.email,
                'checkout[shipping_address][first_name]': this._task.profile.shipping.firstName,
                'checkout[shipping_address][last_name]': this._task.profile.shipping.lastName,
                'checkout[shipping_address][company]': '',
                'checkout[shipping_address][address1]': this._task.profile.shipping.address,
                'checkout[shipping_address][address2]': this._task.profile.shipping.apt,
                'checkout[shipping_address][city]': this._task.profile.shipping.city,
                'checkout[shipping_address][country]': this._task.profile.shipping.country,
                'checkout[shipping_address][province]': this._task.profile.shipping.state,
                'checkout[shipping_address][zip]': this._task.profile.shipping.zipCode,
                'checkout[shipping_address][phone]': phoneFormatter.format(
                    this._task.profile.shipping.phone,
                    '(NNN) NNN-NNNN'
                ),
                'checkout[remember_me]': '0',
                'checkout[client_details][browser_width]': '979',
                'checkout[client_details][browser_height]': '631',
                'checkout[client_details][javascript_enabled]': '1',
                previous_step: 'contact_information',
                step: 'shipping_method',
            };
        }

        rp({
            uri: checkoutUrl,
            followAllRedirects: true,
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

    async run () {
        // abort early if signaled
        if (this._context.aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }
        // add to cart...
        let added = false;
        while (this.retries.ADD_TO_CART > 0 || added) {
            try {
                added = await this._addToCart.run();
            } catch (errors) {
                console.log(`[DEBUG]: CHECKOUT: Add to cart errored out!\n${errors}`);
                this.retries.ADD_TO_CART--;
            }
        }
        if (!added) {
            console.log('[ERROR]: CHECKOUT: Unable to add to cart...');
            return States.Aborted;
        }
        // added! generate checkout URL
        let checkoutData = null;
        while (this.retries.CHECKOUT > 0 || checkoutData) {
            try {
                checkoutData = await this.getCheckoutData();
            } catch (errors) {
                console.log(`[DEBUG]: CHECKOUT: Unable to generate checkout URL\n${errors}`);
                this.retries.CHECKOUT--;
            }
        }
        if (!checkoutData) {
            console.log('[ERROR]: CHECKOUT: Unable to find checkout URL...');
            return States.Aborted;
        }
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
            console.log(`[ERROR]: CHECKOUT: Unable to complete shipping information...\n${errors}`);
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
            console.log(`[ERROR]: CHECKOUT: Unable to find shipping method...\n${}`);
            return States.Aborted;
        }
        // shipping method found, let's proceed to payment

    }

    submitShipping(res) {
        if (res.type === 'poll') {
            console.log(`Shipping Poll URL: ${this._checkoutHost}${res.value}`);
            setTimeout(() => {
                rp({
                    uri: this._checkoutHost + res.value,
                    method: 'GET',
                    headers: {
                        Accept:
                            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'User-Agent': userAgent,
                    },
                })
                .then((body) => {
                    const $ = cheerio.load(body);
                    const shippingMethodValue = $('.radio-wrapper').attr('data-shipping-method');
                    this._authToken = $('form[data-shipping-method-form="true"] input[name="authenticity_token"]').attr('value');

                    console.log(`Shipping Method Value: ${shippingMethodValue}`);
                    console.log('Card information sending...');

                    return shippingMethodValue;

                })
                .then((shippingMethodValue) => {
                    return rp({
                        uri: this._checkoutUrl,
                        followAllRedirects: true,
                        method: 'POST',
                        headers: {
                            'User-Agent': userAgent,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        formData: {
                            utf8: '✓',
                            _method: 'patch',
                            authenticity_token: this._authToken,
                            button: '',
                            previous_step: 'shipping_method',
                            step: 'payment_method',
                            'checkout[shipping_rate][id]': shippingMethodValue,
                        },
                    });
                })
                .then((body) => {
                    const $ = cheerio.load(body);
                    this._price = $('input[name="checkout[total_price]"]').attr('value');
                    this._paymentGateway = $('input[name="checkout[payment_gateway]"]').attr('value');
                    this._authToken = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');

                    return submitPayment();
                })
                .catch((err) => {
                    // error submitting payment
                });
            }, parseInt(this._task.shippingPollTimeout));
        } else if (res.type === 'direct') {
            console.log(`Shipping Method Value: ${res.value}`);
            console.log('Card information sending...');
    
            rp({
                uri: this._checkoutUrl,
                followAllRedirects: true,
                method: 'POST',
                headers: {
                    'User-Agent': userAgent,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                formData: {
                    utf8: '✓',
                    _method: 'patch',
                    authenticity_token: res.authToken,
                    button: '',
                    previous_step: 'shipping_method',
                    step: 'payment_method',
                    'checkout[shipping_rate][id]': res.value,
                },
            })
            .then((body) => {
                const $ = cheerio.load(body);
                this._paymentGateway = $('input[name="checkout[payment_gateway]"]').attr('value');
                this._authToken = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');

                return submitPayment();
            })
            .catch((err) => {
                // error submitting payment
            });
        }
    }

    submitPayment() {
        const paymentInfo = {
            credit_card: {
                number: this._task.profile.payment.cardNumber,
                verification_value: this._task.profile.payment.cvv,
                name: `${this._task.profile.billing.firstName} ${this._task.profile.billing.lastName}`,
                month: parseInt(this._task.profile.payment.exp.slice(0,2)),
                year: parseInt(this._task.profile.payment.exp.slice(3,5)),
            }
        }

        rp({
            uri: `https://elb.deposit.shopifycs.com/sessions`,
            followAllRedirects: true,
            method: 'post',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentInfo),
        })
        .then((res) => {
            return submitBilling(JSON.parse(res).id);
        })
        .catch((err) => {
            // error creating payment session
        });
    }

    submitBilling(sValue) {
        rp({
            uri: this._checkoutUrl,
            followAllRedirects: true,
            method: 'post',
            headers: {
                Origin: this._checkoutHost,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.8',
                Referer: `${this._checkoutHost}/${this._storeID}/checkouts/${this._checkoutID}`,
                'User-Agent': userAgent,
            },
            formData: {
                utf8: '✓',
                _method: 'patch',
                authenticity_token: this._authToken,
                previous_step: 'payment_method',
                step: '',
                s: sValue,
                'checkout[payment_gateway]': this._paymentGateway,
                'checkout[credit_card][vault]': 'false',
                'checkout[different_billing_address]': 'false',
                'checkout[billing_address][first_name]': this._task.profile.billing.firstName,
                'checkout[billing_address][last_name]': this._task.profile.billing.lastName,
                'checkout[billing_address][company]': '',
                'checkout[billing_address][address1]': this._task.profile.billing.address,
                'checkout[billing_address][address2]': this._task.profile.billing.apt,
                'checkout[billing_address][city]': this._task.profile.billing.city,
                'checkout[billing_address][country]': this._task.profile.billing.country,
                'checkout[billing_address][province]': this._task.profile.billing.state,
                'checkout[billing_address][zip]': this._task.profile.billing.zipCode,
                'checkout[billing_address][phone]': phoneFormatter.format(
                    this._task.profile.billing.phone,
                    '(NNN) NNN-NNNN'
                ),
                'checkout[total_price]': this._price,
                complete: '1',
                'checkout[client_details][browser_width]': '979',
                'checkout[client_details][browser_height]': '631',
                'checkout[client_details][javascript_enabled]': '1',
            },
        })
        .then((body) => {
            const $ = cheerio.load(body);
            if ($('input[name="step"]').val() === 'processing') {
                console.log(
                    'Payment is processing, go check your email for a confirmation.'
                );
            } else if ($('title').text().indexOf('Processing') > -1) {
                console.log(
                    'Payment is processing, go check your email for a confirmation.'
                );
            } else if ($('div.notice--warning p.notice__text')) {
                if ($('div.notice--warning p.notice__text') == '') {
                    console.log(`An unknown error has occurred please try again.`, 'error');
                    setTimeout(function() {
                        return process.exit(1);
                    }, 4500);
                } else {
                    console.log(`${$('div.notice--warning p.notice__text').eq(0).text()}`, 'error');
                    setTimeout(function() {
                        return process.exit(1);
                    }, 4500);
                }
            } else {
                console.log(`An unknown error has occurred please try again.`, 'error');
                setTimeout(function() {
                    return process.exit(1);
                }, 4500);
            }
        })
    }
}

module.exports = Checkout;