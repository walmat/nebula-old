const fs = require('fs');
const _ = require('underscore');
const parseString = require('xml2js').parseString;

const j = require('request').jar();
const request = require('request').defaults({
    timeout: 10000,
    jar: j,
});

const log = require('../utils/log');

const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';
let match;
let userHasBeenNotifiedEmpty = false;

module.exports = {};

function findItem(config, proxy, cb) {
    if (config.base_url.endsWith('.xml')) {

        let matchString;
        let foundItems = [];

        request(
            {
                method: 'get',
                url: config.base_url,
                proxy: proxy,
                gzip: true,
                headers: {
                    'User-Agent': userAgent
                }
            },
            function(err, res, body) {

                //TODO – error handling

                parseString(body, function(err, result) {
                    if (err) {
                        log('error parsing sitemap', 'error');
                        process.exit(1);
                    }

                    let products = result['urlset']['url'];
                    products.shift();

                    //TODO – optimize this further
                    for (let i = 0; i < products.length; i++) {

                        let matchCount = 0; //overall "match" count (manipulated by pos/neg keywords)
                        matchString = products[i]['image:image'];
                        if (matchString) {
                            let chk_words = matchString[0]['image:title'].toString().split(' ').splice('-');

                            config.pos_keywords.forEach(word => {
                                chk_words.forEach(chk => {
                                    if (chk.toLowerCase().indexOf(word.toLowerCase()) > -1) { //match detected
                                        //TODO - remove duplicate entries of words so matchCount doesn't increase for the same word
                                        matchCount++;
                                    }
                                });
                            });

                            if (matchCount === config.pos_keywords.length) {
                                foundItems.push(products[i]);
                            }
                        }
                    }

                    foundItems.forEach(item => {
                        console.log(item['image:image'][0]['image:title']);
                    });
                    console.log('length: ' + foundItems.length);

                });
            }
        );
    } else {
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
                    return cb(err, 1000, null);
                } else {
                    try {
                        const products = JSON.parse(body);

                        const foundItems = [];

                        if (products.products.length === 0) {
                            if (userHasBeenNotifiedEmpty) {
                                return cb(true, 1000, null);
                            } else {
                                userHasBeenNotifiedEmpty = true;
                                log("No item's yet...", 'error');
                                return cb(true, 1000, null);
                            }
                        }

                        //todo -- configure this with negative && positive keywords
                        //todo -- find a more efficient way to do this. O(n^2) is trash
                        for (let i = 0; i < config.keywords.length; i++) {
                            for (let x = 0; x < products.products.length; x++) {
                                const name = products.products[x].title;
                                if (name.toLowerCase().indexOf(config.keywords[i].toLowerCase()) > -1) {
                                    foundItems.push(products.products[x]);
                                }
                            }
                        }

                        if (foundItems.length > 0) {
                            if (foundItems.length === 1) {
                                log(`Item Found! - "${foundItems[0].title}"`);
                                match = foundItems[0];
                                return cb(null, null, foundItems[0]);
                            } else {
                                //TODO -- narrow the search down to JUST one item
                                log(`More than 1 item, please select..\n`, 'warning');
                                for (let j = 0; j < foundItems.length; j++) {
                                    log(`Product Choice #${j + 1}: "${foundItems[j].title}"`);
                                }
                                match = foundItems[0]; //todo change this later
                            }
                        } else {
                            return cb('Match not found yet...', null, null);
                        }
                    } catch (e) {
                        if (res.statusCode === 430) {
                            log(`Soft Ban`, 'error');
                            return cb(true, 60000, null); //TODO change this later to a global config
                        } else if (res.statusCode === 401) {
                            log('Password Page detected', 'error');
                            return cb(true, 1000, null); //TODO change this later to a global config
                        } else {
                            log('Unknown error, handle it');
                            return cb(true, null, res.statusCode);
                        }
                    }
                }
            }
        );
    }
}

module.exports.findItem = findItem;

const findvariantstock = function(config, handle, id, cb) {
    request(
        {
            url: `${config.base_url}/products/` + handle + '.json',
            followAllRedirects: true,
            method: 'get',
            headers: {
                'User-Agent': userAgent,
            },
        },
        function(err, res, body) {
            try {
                const variants = JSON.parse(body).product.variants;

                const constiant = _.findWhere(variants, {
                    id: id,
                });

                // console.log(constiant);

                if (constiant.inventory_quantity) {
                    return cb(null, constiant.inventory_quantity);
                } else {
                    return cb(null, 'Unavailable');
                }
            } catch (e) {
                return cb(true, 'Unavailable');
            }
        }
    );
};

function selectStyle(config, res, onSuccess) {
    let styleID;

    //loop over all product variants
    for (let i = 0; i < match.variants.length; i++) {
        styleID = match.variants[i].id; //grab the id of the product
        let size = match.variants[i].option1;
        let optional = match.variants[i].option2;

        //loop over all user's desired sizes
        for (let j = 0; j < config.sizes.length; j++) {
            if (size === config.sizes[j] || optional === config.sizes[j]) { //check to see if it matches one of the user's desired sizes
                findvariantstock(config, match.handle, styleID, function(err, res) {
                    if (err) { // means oos
                        log(`Product: "${size}" (${styleID}) | Stock: ${res}`);
                        onSuccess(match, styleID);
                    } else { // in stock, report that
                        log(`Product: "${size}" (${styleID}) | Stock: ${res}`);
                        onSuccess(match, styleID);
                    }
                });
            }
        }
    }
}

module.exports.selectStyle = selectStyle;
