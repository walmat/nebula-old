/**
 * generic includes
 */
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

/**
 * parsing includes
 */
const _ = require('underscore');
const parseString = require('xml2js').parseString;
const cheerio = require('cheerio');

/**
 * utils includes
 */
const now = require("performance-now");
const {
    formatProxy,
    userAgent,
    getRegionSizes,
} = require('../utils/common');

module.exports = {};

/**
 * Based on the task method, find the product
 * @param {TaskObject} task encapsulates the entire user data for the task
 * @param {String} proxy 
 */
async function findProduct(task, proxy) {
    return task.product.url !== null ? findProductFromURL(task, proxy) :
    task.product.variant !== null ? findProductFromVariant(task, proxy) :
    task.product.pos_keywords !== null ? findProductFromKeywords(task, proxy) :
    null;
}

module.exports.findProduct = findProduct;

async function findProductFromVariant(task, proxy) {
    rp(
        {
            uri: `${task.site}/cart/add.js`,
            followAllRedirects: true,
            method: 'post',
            proxy: formatProxy(proxy),
            headers: {
                Origin: task.site,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: task.product.url,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            formData: {
                id: task.product.variant,
                qty: '1',
            },
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
}

// /**
//  * Grabs product data from a direct link
//  * @param {TaskObject} task encapsulates the entire user data for the task
//  * @param {String} proxy 
//  */
// async function findProductFromURL(task, proxy) {
//     return rp({
//         method: 'GET',
//         uri: `${task.product.url}.json`,
//         proxy: formatProxy(proxy),
//         gzip: false,
//         json: true,
//         simple: false,
//         headers: {
//             'User-Agent': userAgent,
//         }
//     }).then (async function(body) {
//         let products = JSON.parse(JSON.stringify(body));
//         return new Promise(async (resolve) => {
//             // gather essentials needed for checking out
//             if (products.product.length === 0) {
//                 // item not loaded yet, or not found, or something?
//             } else {
//                 let product = [];
//                 // find matching sizes
//                 products.product.variants.map(variant => {
//                     if (task.sizes.some(s => (s === variant.option1 || s === variant.option2 || s === variant.option3))) {
//                         product.push(variant);
//                     }
//                 });
//                 return resolve({error: false, delay: task.monitorDelay, products: product});
//             }
//         });
//     });
// }

/**
 * Grabs product data from a direct link
 * @param {TaskObject} task encapsulates the entire user data for the task
 * @param {String} proxy 
 */
async function findProductFromURL(task, proxy) {
    return rp({
        method: 'GET',
        uri: `${task.product.url}.json`,
        proxy: formatProxy(proxy),
        gzip: false,
        json: true,
        simple: false,
        headers: {
            'User-Agent': userAgent,
        }
    }).then((products) => {
        let variants = JSON.parse(JSON.stringify(products.product.variants));
        return new Promise((resolve, reject) => {
            if (variants) {
                resolve(variants);
            } else {
                reject(null);
            }
        });
    }).then((variants) => {
        let products = [];
        // find matching sizes
        variants.map(variant => {
            if (task.sizes.some(s => (s === variant.option1 || s === variant.option2 || s === variant.option3))) {
                products.push(variant);
            }
        });

        return {error: false, delay: task.monitorDelay, products: products};
    }).catch((err) => {
        console.log(err);
    });
}

/**
 * Monitors an enpoint 
 * @param {TaskObject} task encapsulates the entire user data for the task
 * @param {String} proxy 
 */
async function findProductFromKeywords(task, proxy) {

    /**
     * Send request to the sitemap
     * @param {String} method 'GET'
     * @param {String} url e.g. - https://blendsus.com/sitemap_products_1.xml
     * @param {String} proxy - tasks proxy
     * @param {Boolean} json - whether or not to return the json parsed data
     * @param {Boolean} simple - keep the response "simple" and don't include the entire response, just the body
     * @param {Boolean} gzip - gzip the response, reduce file size
     * @param {Object} headers - any headers to pass along
     */
    return rp({
        method: 'GET',
        url: `${task.site}/sitemap_products_1.xml`,
        proxy: formatProxy(proxy),
        json: true,
        simple: true,
        gzip: true,
        headers: {
            'User-Agent': userAgent,
        }
    }).then((body) => {
        /**
         * Attempt to parse the body {XML} with xml2js
         */
        return new Promise((resolve, reject) => {
            parseString(body, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            })
        });
    })
    .then((res) => {
        const start = now();
        let sortedProducts = _.sortBy(res['urlset']['url'], (product) => {
            return product.lastmod;
        });
        
        // we want to filter the results based on keywords
        let matchedProducts = _.filter(sortedProducts, function(product) {
            if (product && product['image:image']) {
                const title = product['image:image'][0]['image:title'];

                // match every keyword in the positive array
                let pos = _.every(task.product.pos_keywords, function(keyword) {
                    return title[0].toUpperCase().indexOf(keyword) > -1;
                });
                let neg = false; // defaults
                if (task.product.neg_keywords.length > 0) {
                    // match none of the keywords in the negative array
                    // todo.. this won't work with multiple negative keywords I don't think..?
                    neg = _.some(task.product.neg_keywords, function(keyword) {
                        return title[0].toUpperCase().indexOf(keyword) > -1;
                    });
                }
                return pos && !neg;
            }
        });

        console.log(`\n[DEBUG]: Matched ${matchedProducts.length} products..`)
        console.log(`\n[DEBUG]: Found product at: ${matchedProducts[0].loc} \n         Process finding: "${task.product.pos_keywords} ${task.product.neg_keywords}" took ${(now() - start).toFixed(3)}ms\n`);
        if (matchedProducts.length > 0) { // found a product or products!
            if (matchedProducts.length > 1) {
                // handle this case soon..
                // maybe choose the first option based on lastmod?
                // either that or display a list of products that matched somehow..
            } else {
                task.product.url = matchedProducts[0].loc;
                return findProductFromURL(task, proxy);
            }
        } else {
            // no products found, show some error to the user.
        }
    })
    .catch((err) => {
        // todo..
        console.log(err);
    });
}

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