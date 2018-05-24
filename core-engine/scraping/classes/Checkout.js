const open = require('open');
const cheerio = require('cheerio');
const xml2js = require('xml2js');
const log = require('../utils/log');

const j = require('request').jar();
const request = require('request').defaults({
    timeout: 10000,
    jar: j,
});


let Checkout = {};

Checkout.buy = function(config, discordBot, _match, _styleID, userAgent) {
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
                                log(
                                    `This item is currently Sold Out, sorry for the inconvenience`
                                );
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
                            notify(config, discordBot, 'Added to Cart');

                            return input(config, discordBot, auth_token);
                        }
                    );
                }
            );
        }
    );
};

function notify(config, discordBot, msg) {

}