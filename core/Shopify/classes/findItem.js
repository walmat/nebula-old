const fs = require('fs');
const _ = require('underscore');
const parseString = require('xml2js').parseString;

const j = require('request').jar();
const request = require('request').defaults({
    timeout: 10000,
    jar: j,
});

const log = require('../utils/log');

const userAgent = require('../utils/common').userAgent;
let match;
let userHasBeenNotifiedEmpty = false;

module.exports = {};

function findItem(config, discordBot, proxy, cb) {
    //site map parsing
    if (config.base_url.endsWith('.xml')) {
        request(
            {
                url: config.base_url,
                method: 'get',
                headers: {
                    'User-Agent': userAgent,
                },
                proxy: proxy
            },
            function(err, res, body) {
                parseString(body, function(err, result) {
                    if (err) {
                        log('Error parsing site-map', 'error');
                    }
                    log('result.length ' + result.length);
                });
            }
        );
    } else { //we're on the product page (e.g. base_url = https://kith.com/products/cn162204c/)
        request(
            {
                url: `${config.base_url}/products.json`,
                method: 'get',
                headers: {
                    'User-Agent': userAgent,
                },
                proxy: proxy
            },
            function(err, res, body) {
                if (err) {
                    log(err);
                    return cb(err, null);
                } else {
                    try {
                        const products = JSON.parse(body);
                        const foundItems = [];

                        if (products.products.length === 0) {
                            if (userHasBeenNotifiedEmpty) {
                                return cb(true, null);
                            } else {
                                userHasBeenNotifiedEmpty = true;
                                log("No item's available right now still looking...", 'error');
                                return cb(true, null);
                            }
                        }

                        //TODO – find a better way to do this, O(n^2) time as of now. NEED THIS TO BE FAST!!

                        //loop over all products
                        for (let x = 0; x < products.products.length; x++) {
                            for (let y = 0; y < config.pos_keywords.length; y++) {
                                const name = products.products[x].title;
                                //check for match
                                if (name.toLowerCase().indexOf(config.pos_keywords[y].toLowerCase()) > -1) {
                                    //push item to the list of found items
                                    foundItems.push(products.products[x]);
                                }
                            }
                        }

                        if (foundItems.length > 0) {
                            if (foundItems.length === 1) {
                                log(`Item Found! - "${foundItems[0].title}"`);
                                match = foundItems[0];
                                return cb(null, foundItems[0]);
                            } else {
                                log(`More than 1 item matched\n`, 'warning');
                                //TODO handle this case
                                // prompt.get(
                                //     [
                                //         {
                                //             name: 'productSelect',
                                //             required: true,
                                //             description: 'Select a Product # (ex: "2")',
                                //         },
                                //     ],
                                //     function(err, result) {
                                //         const choice = parseInt(result.productSelect);
                                //         match = foundItems[choice - 1];
                                //         log(`You selected - "${match.title}`);
                                //         return cb(null, match);
                                //     }
                                // );
                            }
                        } else {
                            return cb('Match not found yet...', null);
                        }
                    } catch (e) {
                        if (res.statusCode === 430) {
                            //TODO -- swap the proxy out and re-run the process
                            log(
                                `Shopify soft ban`,
                                'error'
                            );
                            process.exit(1);
                        }
                    }
                }
            }
        );
    }
}

module.exports.findItem = findItem;


/**
 * Used to grab the stock of an individual size of a product
 * @param config – used to get the base_url
 * @param discordBot – will be a 'middleman' between the bot and user
 * @param handle – in this case, most likely will be the product SKU, but sometimes stores switch it up
 * @param id – product size id (e.g. – 2450955108359)
 * @param cb – callback function
 */
const findvariantstock = function(config, discordBot, handle, id, cb) {
    request(
        {
            url: `${config.base_url}/products/` + handle + '.json', //e.g. - https://kith.com/products/cn162204c.json
            followAllRedirects: true,
            method: 'get',
            headers: {
                'User-Agent': userAgent,
            },
        },
        function(err, res, body) {
            try {
                const variants = JSON.parse(body).product.variants; //grabs variants

                const constant = _.findWhere(variants, {
                    id: id,
                });
                //TODO – fix this
                if (constant.inventory_quantity) {
                    return cb(null, constant.inventory_quantity);
                } else {
                    return cb(null, 'Unavailable');
                }
            } catch (e) {
                return cb(true, null);
            }
        }
    );
};

/**
 *
 * @param config
 * @param discordBot
 * @param res
 * @param onSuccess
 */
function selectStyle(config, discordBot, res, onSuccess) {
    let stock;
    let styleID;

    //only want one size
    if (match.variants.length === 1) {
        styleID = match.variants[0].id;

        findvariantstock(config, discordBot, match.handle, match.variants[0].id, function(err, res) {
            if (err) {
                //must be out of stock
                log(`${match.variants[0].option1} is out of stock`);
                onSuccess(match, styleID);
            } else {
                log(`${match.variants[0].option1}: ${styleID} – ${res}`);
                onSuccess(match, styleID);
            }
        });
    } else {
        //loop through all size options
        for (let i = 0; i < match.variants.length; i++) {
            const size = match.variants[i].option1;
            const product_id = match.variants[i].option2;
            let stock = "0";

            findvariantstock(match.handle, match.variants[i].id, function (err, res) {
               if (err) stock = "0";
               else {
                   stock = res;
               }
            });

            if (product_id === null) {
                log(`Size: ${size} | Stock: (${stock})`);
            } else {
                log(`SKU: ${product_id} | Size: ${size} | Stock: (${stock}`);
            }
        }
        //TODO – send this data to pay
    }
}

module.exports.selectStyle = selectStyle;