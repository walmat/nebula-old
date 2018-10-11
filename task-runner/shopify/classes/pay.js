const fs = require('fs');
const open = require('open');
const cheerio = require('cheerio');
const phoneFormatter = require('phone-formatter');
const now = require("performance-now");
const j = require('request').jar();
const request = require('request').defaults({
    timeout: 10000,
    jar: j,
});

const { userAgent } = require('../utils/common');
const log = require('../utils/log');

let price, storeID, url, checkoutHost, checkoutID;
let matches;
let start;

module.exports = {};

function pay(task, _matches) {

    start = now();
    matches = _matches;
    let styleID = matches[0].id;

    request(
        {
            url: `${task.site.url}/cart/add.js`,
            followAllRedirects: true,
            method: 'post',
            headers: {
                Origin: task.site.url,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: task.product.url,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            formData: {
                id: styleID,
                qty: '1',
            },
        },
        function(err) {
            if (err) {
                console.log(err, 'error');
            }
            request(
                {
                    url: `${task.site.url}/cart.js`,
                    followAllRedirects: true,
                    method: 'post',
                    headers: {
                        'User-Agent': userAgent,
                    },
                    formData: {
                        quantity: '1',
                        checkout: 'Checkout',
                    },
                },
                function(err, res, body) {
                    if (err) {
                        log(err, 'error');
                    }
                    checkoutHost = 'https://' + res.request.originalHost;
                    console.log(checkoutHost);
                    if (res.request.href.indexOf('stock_problems') > -1) {
                        // out of stock
                        console.log('out of stock');
                        process.exit(1);
                    }

                    const $ = cheerio.load(body);
                    url = res.request.href;
                    checkoutID = url.split('checkouts/')[1];
                    storeID = url.split('/')[3];
                    const auth_token = $(
                        'form.edit_checkout input[name=authenticity_token]'
                    ).attr('value');
                    console.log(`Store ID: ${storeID}`);
                    console.log(`Checkout ID: ${checkoutID}`);
                    console.log(`Auth token: ${auth_token}`);
                    price = $('#checkout_total_price').text();
                    // notify(task, discordBot, '#36a64f', 'Added to Cart');

                    return input(task, auth_token);
                }
            );
        }
    );
}

module.exports.pay = pay;

function input(task, auth_token) {
    console.log(`Checkout URL: ${url}`);
    let form;

    if (url.indexOf('checkout.shopify.com') > -1) {
        console.log(`Checkout with checkout.shopify.com discovered`);
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

    // console.log(form);
    console.log(checkoutHost);
    request(
        {
            url: url,
            followAllRedirects: true,
            headers: {
                Origin: `${checkoutHost}`,
                'User-Agent': userAgent,
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: `${checkoutHost}/`,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            method: 'get',
            qs: form,
        },
        function(err, res, body) {
            if (err) {
                console.log(err, 'error');
            }
            const $ = cheerio.load(body);
            return ship(
                task,
                $('form.edit_checkout input[name=authenticity_token]').attr('value')
            );
        }
    );
}

function ship(task, auth_token) {
    let form;

    console.log(auth_token);

    if (url.indexOf('checkout.shopify.com') > -1) {
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

    request(
        {
            url: url,
            followAllRedirects: true,
            method: 'post',
            headers: {
                Origin: `${checkoutHost}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.8',
                Referer: `${checkoutHost}/${storeID}/checkout/${checkoutID}`,
                'User-Agent': userAgent,
            },
            form: form,
        },
        function(err, res, body) {
            const $ = cheerio.load(body);
            const shipping_pole_url = $('div[data-poll-refresh="[data-step=shipping_method]"]').attr('data-poll-target');
            console.log(`Shipping Poll URL: ${shipping_pole_url}`)
            if (shipping_pole_url === undefined) {
                const firstShippingOption = $(
                    'div.content-box__row .radio-wrapper'
                ).attr('data-shipping-method');
                console.log(firstShippingOption);
                if (firstShippingOption === undefined) {
                    console.log(`${task.site.url} is Incompatible, sorry for the inconvenience. A browser checkout session will be opened momentarily.`);
                    open(url);
                    process.exit(1);
                } else {
                    return submitShipping(task, {
                        type: 'direct',
                        value: firstShippingOption,
                        auth_token: $('input[name="authenticity_token"]').val(),
                    });
                }
            }
            return submitShipping(task, {
                type: 'poll',
                value: shipping_pole_url,
            });
        }
    );
}

function submitShipping(config, res) {
    if (res.type === 'poll') {
        log(`Shipping Poll URL: ${checkoutHost}${res.value}`);
        log(`Timing out Shipping for ${config.shipping_pole_timeout}ms`);

        setTimeout(function() {
            request(
                {
                    url: checkoutHost + res.value,
                    method: 'get',
                    headers: {
                        Accept:
                            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'User-Agent': userAgent,
                    },
                },
                function(err, res, body) {
                    const $ = cheerio.load(body);

                    const shipping_method_value = $('.radio-wrapper').attr('data-shipping-method');
                    const auth_token = $('form[data-shipping-method-form="true"] input[name="authenticity_token"]').attr('value');

                    log(`Shipping Method Value: ${shipping_method_value}`);
                    log('Card information sending...');

                    request(
                        {
                            url: url,
                            followAllRedirects: true,
                            method: 'post',
                            headers: {
                                'User-Agent': userAgent,
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            formData: {
                                utf8: '✓',
                                _method: 'patch',
                                authenticity_token: auth_token,
                                button: '',
                                previous_step: 'shipping_method',
                                step: 'payment_method',
                                'checkout[shipping_rate][id]': shipping_method_value,
                            },
                        },
                        function(err, res, body) {
                            const $ = cheerio.load(body);

                            const price = $('input[name="checkout[total_price]"]').attr('value');
                            const payment_gateway = $('input[name="checkout[payment_gateway]"]').attr('value');
                            const new_auth_token = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');

                            submitCC(config, discordBot, new_auth_token, price, payment_gateway);
                        }
                    );
                }
            );
        }, parseInt(config.shipping_pole_timeout));
    } else if (res.type === 'direct') {
        console.log(`Shipping Method Value: ${res.value}`);
        console.log('Card information sending...');

        request(
            {
                url: url,
                followAllRedirects: true,
                method: 'post',
                headers: {
                    'User-Agent': userAgent,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                formData: {
                    utf8: '✓',
                    _method: 'patch',
                    authenticity_token: res.auth_token,
                    button: '',
                    previous_step: 'shipping_method',
                    step: 'payment_method',
                    'checkout[shipping_rate][id]': res.value,
                },
            },
            function(err, res, body) {
                const $ = cheerio.load(body);
                const payment_gateway = $(
                    'input[name="checkout[payment_gateway]"]'
                ).attr('value');
                const new_auth_token = $(
                    'form[data-payment-form=""] input[name="authenticity_token"]'
                ).attr('value');

                console.log(`Price: ${price}`);
                console.log(`Payment Gateway ID: ${payment_gateway}`);

                submitCC(config, new_auth_token, price, payment_gateway);
            }
        );
    }
}

function submitCC(config, new_auth_token, price, payment_gateway) {
    //TODO – this info will be pulled from dynamo and stored locally
    const ccInfo = {
        credit_card: {
            number: config.cardNumber,
            verification_value: config.CCV,
            name: config.firstName + ' ' + config.lastName,
            month: parseInt(config.month),
            year: parseInt(config.year),
        },
    };
    request(
        {
            url: `https://elb.deposit.shopifycs.com/sessions`,
            followAllRedirects: true,
            method: 'post',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ccInfo),
        },
        function(err, res, body) {
            const sValue = JSON.parse(body).id;

            request(
                {
                    url: url,
                    followAllRedirects: true,
                    method: 'post',
                    headers: {
                        Origin: checkoutHost,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept:
                            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.8',
                        Referer: `${checkoutHost}/${storeID}/checkouts/${checkoutID}`,
                        'User-Agent': userAgent,
                    },
                    formData: {
                        utf8: '✓',
                        _method: 'patch',
                        authenticity_token: new_auth_token,
                        previous_step: 'payment_method',
                        step: '',
                        s: sValue,
                        'checkout[payment_gateway]': payment_gateway,
                        'checkout[credit_card][vault]': 'false',
                        'checkout[different_billing_address]': 'false',
                        'checkout[billing_address][first_name]': config.profile.billing.firstName,
                        'checkout[billing_address][last_name]': config.profile.billing.lastName,
                        'checkout[billing_address][company]': '',
                        'checkout[billing_address][address1]': config.profile.billing.address,
                        'checkout[billing_address][address2]': config.profile.billing.apt,
                        'checkout[billing_address][city]': config.profile.billing.city,
                        'checkout[billing_address][country]': config.profile.billing.country,
                        'checkout[billing_address][province]': config.profile.billing.state,
                        'checkout[billing_address][zip]': config.profile.billing.zipCode,
                        'checkout[billing_address][phone]': phoneFormatter.format(
                            config.profile.billing.phone,
                            '(NNN) NNN-NNNN'
                        ),
                        'checkout[total_price]': price,
                        complete: '1',
                        'checkout[client_details][browser_width]': '979',
                        'checkout[client_details][browser_height]': '631',
                        'checkout[client_details][javascript_enabled]': '1',
                    },
                },
                function(err, res, body) {
                    if (process.env.DEBUG) {
                        fs.writeFile('debug.html', body, function(err) {
                            if (err) {
                                log(err, 'error');
                            }
                            console.log(
                                'The file debug.html was saved the root of the project file.'
                            );
                        });
                    }
                    const $ = cheerio.load(body);
                    if ($('input[name="step"]').val() === 'processing') {
                        console.log(
                            'Payment is processing, go check your email for a confirmation.'
                        );
                        setTimeout(function() {
                            return process.exit(1);
                        }, 4500);
                    } else if ($('title').text().indexOf('Processing') > -1) {
                        console.log(
                            'Payment is processing, go check your email for a confirmation.'
                        );
                        setTimeout(function() {
                            return process.exit(1);
                        }, 4500);
                    } else if (res.request.href.indexOf('paypal.com') > -1) {
                        const open = require('open');
                        console.log(
                            'This website only supports PayPal, sorry for the inconvenience.'
                        );
                        open(res.request.href);
                        setTimeout(function() {
                            return process.exit(1);
                        }, 3000);
                    } else if ($('div.notice--warning p.notice__text')) {
                        if ($('div.notice--warning p.notice__text') == '') {
                            console.log(`checkout took: ${(now() - start).toFixed(3)}ms`)
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
                }
            );
        }
    );
}

function notify(config, discordBot, color, type) {
    //TODO send the notification of successful checkout to discord
}

module.exports.notify = notify;