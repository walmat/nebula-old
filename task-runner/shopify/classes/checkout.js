const cheerio = require('cheerio');
const phoneFormatter = require('phone-formatter');
const now = require("performance-now");
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

const {
    formatProxy,
    userAgent,
} = require('./utils');

class Checkout {

    constructor(task, proxy) {

         /**
         * Task Data for the running task
         * @type {TaskObject}
         */
        this._task = task;

        /**
         * Proxy to run the task with
         * @type {String}
         */
        this._proxy = proxy;

        /**
         * Price for the product
         * @type {String}
         */
        this._price = null;

        /**
         * Store ID for the task running this checkout
         * @type {String}
         */
        this._storeID = null;

        /**
         * Checkout URL for the task running
         * @type {String}
         */
        this._checkoutUrl = null;

        /**
         * Checkout host for the task running
         * @type {String}
         */
        this._checkoutHost = null;

        /**
         * Checkout ID for the task running
         * @type {String}
         */
        this._checkoutID = null;

        /**
         * All matched variants for the given product
         */
        this._matchedVariants = null;

        /**
         * Authorization token for the checkout
         */
        this._authToken = null;

        /**
         * Payment gateway for the given checkout session
         */
        this._paymentGateway = null;
    }

    addToCart() {

        const styleID = this._matchedVariants[0].id;

        rp({
            uri: `${this._task.site.url}/cart/add.js`,
            followAllRedirects: true,
            method: 'post',
            headers: {
                Origin: this._task.site.url,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: this._task.product.url,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            formData: {
                id: styleID,
                qty: '1',
            },
        })
        .then((res) => {
            // check response for successful add to cart
            if (res.length > 0) {
                return goToCheckout();
            }   
        }).catch((err) => {
            // error adding to cart
        });
    }

    goToCheckout() {
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
            this._checkoutHost = `https://${res.request.originalHost}`;

            if (res.request.href.indexOf('stock_problems') > -1) {
                // out of stock, run for restocks
            } else {
                const $ = cheerio.load(body);
                this._checkoutUrl = res.request.href;
                this._checkoutID = this._checkoutUrl.split('checkouts/')[1];
                this._storeID = this._checkoutUrl.split('/')[3];
                this._authToken = $('form.edit_checkout input[name=authenticity_token]').attr('value');
                console.log(`Store ID: ${this._storeID}`);
                console.log(`Checkout ID: ${this._checkoutID}`);
                console.log(`Auth token: ${this._authToken}`);
                this._price = $('#checkout_total_price').text();

                return inputShipping();
            }

        })
        .catch((err) => {
            // error going to checkout
        });
    }

    inputShipping() {
        let form;

        if (this._checkoutUrl.indexOf('checkout.shopify.com') > -1) {
            form = {
                utf8: '✓',
                _method: 'patch',
                authenticity_token: auth_token,
                previous_step: 'contact_information',
                step: 'shipping_method',
                'checkout[email]': task.payment.email,
                'checkout[buyer_accepts_marketing]': '1',
                'checkout[shipping_address][first_name]': task.profile.shipping.firstName,
                'checkout[shipping_address][last_name]': task.profile.shipping.lastName,
                'checkout[shipping_address][company]': '',
                'checkout[shipping_address][address1]': task.profile.shipping.address,
                'checkout[shipping_address][address2]': task.profile.shipping.apt,
                'checkout[shipping_address][city]': task.profile.shipping.city,
                'checkout[shipping_address][country]': task.profile.shipping.country,
                'checkout[shipping_address][province]': task.profile.shipping.state,
                'checkout[shipping_address][zip]': task.profile.shipping.zipCode,
                'checkout[shipping_address][phone]': task.profile.shipping.phone,
                'checkout[remember_me]': '0',
                button: '',
                'checkout[client_details][browser_width]': '979',
                'checkout[client_details][browser_height]': '631',
            };
        } else {
            form = {
                utf8: '✓',
                _method: 'patch',
                authenticity_token: auth_token,
                previous_step: 'contact_information',
                'checkout[email]': task.profile.payment.email,
                'checkout[shipping_address][first_name]': task.profile.shipping.firstName,
                'checkout[shipping_address][last_name]': task.profile.shipping.lastName,
                'checkout[shipping_address][company]': '',
                'checkout[shipping_address][address1]': task.profile.shipping.address,
                'checkout[shipping_address][address2]': task.profile.shipping.apt,
                'checkout[shipping_address][city]': task.profile.shipping.city,
                'checkout[shipping_address][country]': task.profile.shipping.country,
                'checkout[shipping_address][province]': task.profile.shipping.state,
                'checkout[shipping_address][zip]': task.profile.shipping.zipCode,
                'checkout[shipping_address][phone]': task.profile.shipping.phone,
                'checkout[remember_me]': '0',
                'checkout[client_details][browser_width]': '979',
                'checkout[client_details][browser_height]': '631',
                'checkout[client_details][javascript_enabled]': '1',
                step: 'contact_information',
            };
        }

        rp({
            uri: this._checkoutUrl,
            followAllRedirects: true,
            headers: {
                Origin: `${this._checkoutHost}`,
                'User-Agent': userAgent,
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: `${this._checkoutHost}/`,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            method: 'get',
            qs: form,
        })
        .then((body) => {
            const $ = cheerio.load(body);
            this._authToken = $('form.edit_checkout input[name=authenticity_token]').attr('value');
            return requestShipping();
        })
        .catch((err) => {
            // error filling out form for some reason..
        });
    }

    requestShipping() {
        let form;

        if (this._checkoutUrl.indexOf('checkout.shopify.com') > -1) {
            form = {
                _method: 'patch',
                authenticity_token: auth_token,
                button: '',
                'checkout[client_details][browser_width]': '979',
                'checkout[client_details][browser_height]': '631',
                'checkout[client_details][javascript_enabled]': '1',
                'checkout[email]': task.profile.payment.email,
                'checkout[shipping_address][address1]': task.profile.shipping.address,
                'checkout[shipping_address][address2]': task.profile.shipping.apt,
                'checkout[shipping_address][city]': task.profile.shipping.city,
                'checkout[shipping_address][country]': task.profile.shipping.country,
                'checkout[shipping_address][first_name]': task.profile.shipping.firstName,
                'checkout[shipping_address][last_name]': task.profile.shipping.lastName,
                'checkout[shipping_address][phone]': task.profile.shipping.phone,
                'checkout[shipping_address][province]': task.profile.shipping.state,
                'checkout[shipping_address][zip]': task.profile.shipping.zipCode,
                previous_step: 'contact_information',
                remember_me: 'false',
                step: 'shipping_method',
                utf8: '✓',
            };
        } else {
            form = {
                utf8: '✓',
                _method: 'patch',
                authenticity_token: auth_token,
                button: '',
                'checkout[email]': task.profile.payment.email,
                'checkout[shipping_address][first_name]': task.profile.shipping.firstName,
                'checkout[shipping_address][last_name]': task.profile.shipping.lastName,
                'checkout[shipping_address][company]': '',
                'checkout[shipping_address][address1]': task.profile.shipping.address,
                'checkout[shipping_address][address2]': task.profile.shipping.apt,
                'checkout[shipping_address][city]': task.profile.shipping.city,
                'checkout[shipping_address][country]': task.profile.shipping.country,
                'checkout[shipping_address][province]': task.profile.shipping.state,
                'checkout[shipping_address][zip]': task.profile.shipping.zipCode,
                'checkout[shipping_address][phone]': phoneFormatter.format(
                    task.profile.shipping.phone,
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
            uri: this._checkoutUrl,
            followAllRedirects: true,
            method: 'post',
            headers: {
                Origin: `${this._checkoutHost}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.8',
                Referer: `${this._checkoutHost}/${this._storeID}/checkout/${this._checkoutID}`,
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
                    console.log(`Unable to find checkout option for ${this._checkoutUrl}`);
                    process.exit(1);
                } else {
                    return submitShipping({
                        type: 'direct',
                        value: firstShippingOption,
                        authToken: $('input[name="authenticity_token"]').val(),
                    });
                }
            }
            return submitShipping({
                type: 'poll',
                value: shippingPollUrl,
            });
        })
        .catch((err) => {
            // error getting shipping options
        });
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
                name: `${this._task.profile.billing.firstName} ${this._task.profile.billing.lastName}`
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