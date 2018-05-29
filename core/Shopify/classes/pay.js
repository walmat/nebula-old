const fs = require('fs');
const open = require('open');
const cheerio = require('cheerio');
const phoneFormatter = require('phone-formatter');
const j = require('request').jar();
const request = require('request').defaults({
    timeout: 10000,
    jar: j,
});

const userAgent = require('../utils/common').userAgent;
const log = require('../utils/log');

let price, storeID, url, checkoutHost, checkoutID;
let match;
let styleID;

module.exports = {};

//pull in config from dynamoDB

function pay(config, discordBot, _match, _styleID) {
    match = _match;
    styleID = _styleID;
    request(
        {
            url: `${config.base_url}/products/` + match.handle,
            followAllRedirects: true,
            method: 'get',
            headers: {
                'User-Agent': userAgent,
            },
        },
        function(err) {
            if (err) {
                log(err, 'error');
            }
        }
    );

    request(
        {
            url: `${config.base_url}/cart/add.js`,
            followAllRedirects: true,
            method: 'post',
            headers: {
                Origin: config.base_url,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: config.base_url + '/products/' + match.handle,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            formData: {
                id: styleID,
                qty: '1',
            },
        },
        function(err) {
            if (err) {
                log(err, 'error');
            }
            request(
                {
                    url: `${config.base_url}/cart`,
                    followAllRedirects: true,
                    method: 'get',
                    headers: {
                        'User-Agent': userAgent,
                    },
                },
                function(err) {
                    if (err) {
                        log(err, 'error');
                    }
                    log('Added to cart!');
                    log('Checking out your item...');
                    request(
                        {
                            url: `${config.base_url}/cart`,
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

                            if (res.request.href.indexOf('stock_problems') > -1) {
                                log(`This item is currently Sold Out, sorry for the inconvenience`);
                                process.exit(1);
                            }

                            const $ = cheerio.load(body);
                            url = res.request.href;
                            checkoutID = url.split('checkouts/')[1];
                            storeID = url.split('/')[3];
                            const auth_token = $(
                                'form.edit_checkout input[name=authenticity_token]'
                            ).attr('value');
                            log(`Store ID: ${storeID}`);
                            log(`Checkout ID: ${checkoutID}`);
                            price = $('#checkout_total_price').text();
                            notify(config, discordBot, '#36a64f', 'Added to Cart');

                            return input(config, discordBot, auth_token);
                        }
                    );
                }
            );
        }
    );
}

module.exports.pay = pay;

function input(config, discordBot, auth_token) {
    log(`Checkout URL: ${url}`);
    let form;

    if (url.indexOf('checkout.shopify.com') > -1) {
        log(`Checkout with checkout.shopify.com discovered`);
        form = {
            utf8: '✓',
            _method: 'patch',
            authenticity_token: auth_token,
            previous_step: 'contact_information',
            step: 'shipping_method',
            'checkout[email]': config.email,
            'checkout[buyer_accepts_marketing]': '1',
            'checkout[shipping_address][first_name]': config.firstName,
            'checkout[shipping_address][last_name]': config.lastName,
            'checkout[shipping_address][company]': '',
            'checkout[shipping_address][address1]': config.address,
            'checkout[shipping_address][address2]': '',
            'checkout[shipping_address][city]': config.city,
            'checkout[shipping_address][country]': config.country,
            'checkout[shipping_address][province]': config.state,
            'checkout[shipping_address][zip]': config.zipCode,
            'checkout[shipping_address][phone]': config.phoneNumber,
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
            'checkout[email]': config.email,
            'checkout[shipping_address][first_name]': config.firstName,
            'checkout[shipping_address][last_name]': config.lastName,
            'checkout[shipping_address][company]': '',
            'checkout[shipping_address][address1]': config.address,
            'checkout[shipping_address][address2]': '',
            'checkout[shipping_address][city]': config.city,
            'checkout[shipping_address][country]': config.country,
            'checkout[shipping_address][province]': config.state,
            'checkout[shipping_address][zip]': config.zipCode,
            'checkout[shipping_address][phone]': config.phoneNumber,
            'checkout[remember_me]': '0',
            'checkout[client_details][browser_width]': '979',
            'checkout[client_details][browser_height]': '631',
            'checkout[client_details][javascript_enabled]': '1',
            step: 'contact_information',
        };
    }

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
                log(err, 'error');
            }
            const $ = cheerio.load(body);
            return ship(
                config,
                $('form.edit_checkout input[name=authenticity_token]').attr('value')
            );
        }
    );
}

function ship(config, discordBot, auth_token) {
    let form;

    if (url.indexOf('checkout.shopify.com') > -1) {
        form = {
            _method: 'patch',
            authenticity_token: auth_token,
            button: '',
            'checkout[client_details][browser_width]': '979',
            'checkout[client_details][browser_height]': '631',
            'checkout[client_details][javascript_enabled]': '1',
            'checkout[email]': config.email,
            'checkout[shipping_address][address1]': config.address1,
            'checkout[shipping_address][address2]': config.address2,
            'checkout[shipping_address][city]': config.city,
            'checkout[shipping_address][country]': config.country,
            'checkout[shipping_address][first_name]': config.firstName,
            'checkout[shipping_address][last_name]': config.lastName,
            'checkout[shipping_address][phone]': config.phoneNumber,
            'checkout[shipping_address][province]': config.state,
            'checkout[shipping_address][zip]': config.zipCode,
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
            'checkout[email]': config.email,
            'checkout[shipping_address][first_name]': config.firstName,
            'checkout[shipping_address][last_name]': config.lastName,
            'checkout[shipping_address][company]': '',
            'checkout[shipping_address][address1]': config.address1,
            'checkout[shipping_address][address2]': config.address2,
            'checkout[shipping_address][city]': config.city,
            'checkout[shipping_address][country]': config.country,
            'checkout[shipping_address][province]': config.state,
            'checkout[shipping_address][zip]': config.zipCode,
            'checkout[shipping_address][phone]': phoneFormatter.format(
                config.phoneNumber,
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
                Referer: `${checkoutHost}/${storeID}/checkouts/${checkoutID}`,
                'User-Agent': userAgent,
            },
            formData: form,
        },
        function(err, res, body) {
            const $ = cheerio.load(body);
            const shipping_pole_url = $(
                'div[data-poll-refresh="[data-step=shipping_method]"]'
            ).attr('data-poll-target');
            if (shipping_pole_url === undefined) {
                const firstShippingOption = $(
                    'div.content-box__row .radio-wrapper'
                ).attr('data-shipping-method');
                if (firstShippingOption === undefined) {
                    log(`${config.base_url} is Incompatible, sorry for the inconvenience. A browser checkout session will be opened momentarily.`);
                    open(url);
                    process.exit(1);
                } else {
                    return submitShipping(config, discordBot, {
                        type: 'direct',
                        value: firstShippingOption,
                        auth_token: $('input[name="authenticity_token"]').val(),
                    });
                }
            }
            return submitShipping(config, discordBot, {
                type: 'poll',
                value: shipping_pole_url,
            });
        }
    );
}

function submitShipping(config, discordBot, res) {
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
        log(`Shipping Method Value: ${res.value}`);
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

                log(`Price: ${price}`);
                log(`Payment Gateway ID: ${payment_gateway}`);

                submitCC(config, discordBot, new_auth_token, price, payment_gateway);
            }
        );
    }
}

function submitCC(config, discordBot, new_auth_token, price, payment_gateway) {
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
                        'checkout[billing_address][first_name]': config.firstName,
                        'checkout[billing_address][last_name]': config.lastName,
                        'checkout[billing_address][company]': '',
                        'checkout[billing_address][address1]': config.address1,
                        'checkout[billing_address][address2]': config.address2,
                        'checkout[billing_address][city]': config.city,
                        'checkout[billing_address][country]': config.country,
                        'checkout[billing_address][province]': config.state,
                        'checkout[billing_address][zip]': config.zipCode,
                        'checkout[billing_address][phone]': phoneFormatter.format(
                            config.phoneNumber,
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
                            log(
                                'The file debug.html was saved the root of the project file.'
                            );
                        });
                    }
                    const $ = cheerio.load(body);
                    if ($('input[name="step"]').val() === 'processing') {
                        log(
                            'Payment is processing, go check your email for a confirmation.'
                        );
                        notify(
                            config,
                            discordBot,
                            '#36a64f',
                            'Payment is processing, go check your email for a confirmation.'
                        );
                        setTimeout(function() {
                            return process.exit(1);
                        }, 4500);
                    } else if ($('title').text().indexOf('Processing') > -1) {
                        log(
                            'Payment is processing, go check your email for a confirmation.'
                        );
                        notify(
                            config,
                            discordBot,
                            '#36a64f',
                            'Payment is processing, go check your email for a confirmation.'
                        );
                        setTimeout(function() {
                            return process.exit(1);
                        }, 4500);
                    } else if (res.request.href.indexOf('paypal.com') > -1) {
                        notify(
                            config,
                            discordBot,
                            '#4FC3F7',
                            `This website only supports PayPal, sorry for the inconvenience. <${res
                                .request.href}|Click Here>`
                        );
                        const open = require('open');
                        log(
                            'This website only supports PayPal, sorry for the inconvenience.'
                        );
                        open(res.request.href);
                        setTimeout(function() {
                            return process.exit(1);
                        }, 3000);
                    } else if ($('div.notice--warning p.notice__text')) {
                        if ($('div.notice--warning p.notice__text') == '') {
                            notify(
                                config,
                                discordBot,
                                '#ef5350',
                                'An unknown error has occurred.'
                            );
                            log(`An unknown error has occurred please try again.`, 'error');
                            setTimeout(function() {
                                return process.exit(1);
                            }, 4500);
                        } else {
                            notify(config, discordBot, '#ef5350', `${$('div.notice--warning p.notice__text').eq(0).text()}`);
                            log(`${$('div.notice--warning p.notice__text').eq(0).text()}`, 'error');
                            setTimeout(function() {
                                return process.exit(1);
                            }, 4500);
                        }
                    } else {
                        notify(config, discordBot, '#ef5350', 'An unknown error has occurred.');
                        log(`An unknown error has occurred please try again.`, 'error');
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