const _ = require('underscore');
const parseString = require('xml2js').parseString;
const cheerio = require('cheerio');
var now = require("performance-now");

const j = require('request').jar();
const request = require('request').defaults({
    timeout: 10000,
    jar: j,
});

const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';
let match;

module.exports = {};

/**
 * Formats the proxy correctly to be used in a request
 * @param {*} input - IP:PORT:USER:PASS || IP:PORT
 * @returns - http://USER:PASS@IP:PORT || http://IP:PORT
 */
function formatProxy(input) {

    // safeguard for if it's already formatted or in a format we can't handle
    if (input === null || input === undefined || input.startsWith('http') || input === 'localhost') {
        return input;
    } else {
        let data = input.split(':');
        return (data.length === 2) ? 'http://' + data[0] + ':' + data[1] :
               (data.length === 4) ? 'http://' + data[2] + ':' + data[3] + '@' + data[0] + ':' + data[1] :
               null;
    }
}

function trimKeywords(arr) {
    let ret = [];
    arr.map(word => {
        ret.push(word.substring(1, word.length).trim().toUpperCase()); //trim() just in case, probably not necessary
    });
    return ret;
}

function findProduct(task, proxy, cb) {

    if (task.product.url !== null) {
        request(
            {
                method: 'GET',
                url: `${task.product.url}.json`,
                proxy: formatProxy(proxy),
                gzip: false,
                headers: {
                    'User-Agent': userAgent,
                }
            }, 
            function (err, res, body) {
                if (err) {
                    // keep in mind – 404 error COULD & SHOULD happen before product is loaded
                    return cb(true, task.delay, err);
                }
                try {
                    // gather essentials needed for checking out
                    const products = JSON.parse(body);
                    if (products.product.length === 0) {
                        // item not loaded yet, or not found, or something?
                    } else {
                        let product = [];
                        // find matching sizes
                        products.product.variants.map(variant => {
                            if (task.sizes.some(s => (s === variant.option1 || s === variant.option2 || s === variant.option3))) {
                                product.push(variant);
                            }
                        });
                        return cb(false, null, product);
                    }
                } catch (e) {
                    console.log(e);
                    if (res.statusCode === 430) {
                        return cb(true, task.error_delay, null);
                    } else if (res.statusCode === 401) {
                        return cb(true, task.delay, null);
                    } else {
                        // unknown error, handle it
                        return cb(true, null, res.statusCode);
                    }
                }
            }
        )


    } else if (task.product.variant !== null) {
        request(
            {
                method: 'GET',
                url: `${task.site}/cart/${task.product.variant}:1`,
                proxy: formatProxy(proxy),
                gzip: false,
                headers: {
                    'User-Agent': userAgent,
                }
            }, function (err, res, body) {
                if (err) {
                    return cb(true, task.delay, err);
                }

                if (res.statusCode === 200) {
                    const $ = cheerio.load(body);
                    // todo
                } 
            }
        )
        
    } else if (task.product.pos_keywords !== null) {

        let matchedProducts = [];
        request(
            {
                method: 'GET',
                url: `${task.site}/sitemap_products_1.xml`,
                proxy: formatProxy(proxy),
                gzip: true,
                headers: {
                    'User-Agent': userAgent,
                }
            }, function (err, res, body) {
                if (err) {
                    // let's try some other method before we decide it's another error..
                    // gotta come up with multiple ways to parse shit
                    return cb(true, err);
                }
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // parse xml
                    parseString(body, function(err, res) {
                        if (err) {
                            //parsing error
                            return cb(true, err);
                        } else if (body.indexOf('http://www.sitemaps.org/schemas') > -1) { // sitemap returned correctly
                            var start = now();
                            let products = _.sortBy(res['urlset']['url'], function(product) {
                                return product.lastmod; // sort by most recent products
                            });
                            products.map(product => {
                                if (product) { // null check
                                    if (product['image:image']) { // null check
                                        title = product['image:image'][0]['image:title'];
                                        /**
                                         * make the product matching work like so:
                                         * 1. if ALL pos_keywords found in word A, consider A matched.
                                         * 2. if ANY neg_keywords found in word A, consider A not matched.
                                         * 
                                         * if 1 === true, and 2 === false, consider A "matched"
                                         */
                                        // https://underscorejs.org/#every
                                        let pos = _.every(trimKeywords(task.product.pos_keywords), function(keyword) {
                                            return title[0].indexOf(keyword) > -1;
                                        });
                                        let neg = _.some(trimKeywords(task.product.neg_keywords), function(keyword) {
                                            return title[0].indexOf(keyword) > -1;
                                        });
                                        if (pos && !neg) {
                                            matchedProducts.push(product.loc);
                                        }
                                    }
                                }
                            });
                            
                            console.log(matchedProducts);
                            console.log(`finding products for: "${task.product.pos_keywords} ${task.product.neg_keywords}" took ${(now() - start).toFixed(3)}ms`);
                       
                            if (matchedProducts.length > 0) { // found a product!
                                return cb(null, task.delay, matchedProducts);
                            } else { // keep monitoring
                                
                            }
                        }
                    });
                }
                
            }
        )
    }
        
    // } else if (task.site.endsWith('.xml')) {

    //     let matchString;
    //     let foundItems = [];
    //     request(
    //         {
    //             method: 'get',
    //             url: config.base_url,
    //             proxy: proxy,
    //             gzip: true,
    //             headers: {
    //                 'User-Agent': userAgent
    //             }
    //         },
    //         function(err, res, body) {

    //             //TODO – error handling

    //             parseString(body, function(err, result) {
    //                 if (err) {
    //                     log('error parsing sitemap', 'error');
    //                     process.exit(1);
    //                 }

    //                 let products = result['urlset']['url'];
    //                 products.shift();

    //                 //TODO – optimize this further
    //                 for (let i = 0; i < products.length; i++) {

    //                     let matchCount = 0; //overall "match" count (manipulated by pos/neg keywords)
    //                     matchString = products[i]['image:image'];
    //                     if (matchString) {
    //                         let chk_words = matchString[0]['image:title'].toString().split(' ').splice('-');

    //                         config.pos_keywords.forEach(word => {
    //                             if (chk_words.map(chk => chk.toLowerCase()).includes(word.toLowerCase())) {
    //                                 matchCount++;
    //                             }
    //                         });

    //                         if (matchCount === config.pos_keywords.length) {
    //                             foundItems.push(products[i]);
    //                         }
    //                     }
    //                 }

    //                 foundItems.forEach(item => {
    //                     console.log(item['image:image'][0]['image:title']);
    //                 });
    //                 console.log('length: ' + foundItems.length);
    //                 return cb(null, null, foundItems);
    //             });
    //         }
    //     );
    // } else {
    //     request(
    //         {
    //             url: `${config.base_url}/products.json`,
    //             method: 'get',
    //             headers: {
    //                 'User-Agent': userAgent,
    //             },
    //             proxy: proxy
    //         },
    //         function(err, res, body) {
    //             if (err) {
    //                 log(err);
    //                 return cb(err, 1000, null);
    //             } else {
    //                 try {
    //                     const products = JSON.parse(body);

    //                     const foundItems = [];

    //                     if (products.products.length === 0) {
    //                         if (userHasBeenNotifiedEmpty) {
    //                             return cb(true, 1000, null);
    //                         } else {
    //                             userHasBeenNotifiedEmpty = true;
    //                             log("No item's yet...", 'error');
    //                             return cb(true, 1000, null);
    //                         }
    //                     }

    //                     //todo -- configure this with negative && positive keywords
    //                     //todo -- find a more efficient way to do this. O(n^2) is trash
    //                     for (let i = 0; i < config.keywords.length; i++) {
    //                         for (let x = 0; x < products.products.length; x++) {
    //                             const name = products.products[x].title;
    //                             if (name.toLowerCase().indexOf(config.keywords[i].toLowerCase()) > -1) {
    //                                 foundItems.push(products.products[x]);
    //                             }
    //                         }
    //                     }

    //                     if (foundItems.length > 0) {
    //                         if (foundItems.length === 1) {
    //                             log(`Item Found! - "${foundItems[0].title}"`);
    //                             match = foundItems[0];
    //                             return cb(null, null, foundItems[0]);
    //                         } else {
    //                             //TODO -- narrow the search down to JUST one item
    //                             log(`More than 1 item, please select..\n`, 'warning');
    //                             for (let j = 0; j < foundItems.length; j++) {
    //                                 log(`Product Choice #${j + 1}: "${foundItems[j].title}"`);
    //                             }
    //                             match = foundItems[0]; //todo change this later
    //                         }
    //                     } else {
    //                         return cb('Match not found yet...', null, null);
    //                     }
    //                 } catch (e) {
    //                     if (res.statusCode === 430) {
    //                         log(`Soft Ban`, 'error');
    //                         return cb(true, 60000, null); //TODO change this later to a global config
    //                     } else if (res.statusCode === 401) {
    //                         log('Password Page detected', 'error');
    //                         return cb(true, 1000, null); //TODO change this later to a global config
    //                     } else {
    //                         log('Unknown error, handle it');
    //                         return cb(true, null, res.statusCode);
    //                     }
    //                 }
    //             }
    //         }
    //     );
    // }
}

module.exports.findProduct = findProduct;

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

function getVariantsBySize(task, productUrl, onSuccess) {
    let styleID;

    console.log(productUrl);
    request(
        {
            url: `${productUrl}.json`,
            followAllRedirects: true,
            method: 'get',
            headers: {
                'User-Agent': userAgent,
            },
        },
        function(err, res, body) {
            try {
                let matches = [];
                const variants = JSON.parse(body).product.variants;
                _.filter(variants, function(variant) {
                    let match = _.some(task.sizes, function(size) {
                        return variant.option1 === size || variant.option2 === size || variant.option3 === size;
                    });
                    if (match) {
                        matches.push(variant);
                    }
                });
                return onSuccess(matches, productUrl);
            } catch (e) {
                console.log(e);
            }
        }
    );
}

module.exports.getVariantsBySize = getVariantsBySize;