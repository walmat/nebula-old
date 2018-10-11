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
} = require('../utils/common');
const urlToSize = require('./utils/urlToSize');

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
            uri: `${task.site.url}/cart/add.js`,
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
        return parseVariants(task, variants);
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
     * @param {String} url e.g. - https://blendsus.com/products.json
     * @param {String} proxy - tasks proxy
     * @param {Boolean} json - whether or not to return the json parsed data
     * @param {Boolean} simple - keep the response "simple" and don't include the entire response, just the body
     * @param {Boolean} gzip - gzip the response, reduce file size
     * @param {Object} headers - any headers to pass along
     */
    return rp({
        method: 'GET',
        url: `${task.site.url}/products.json`,
        proxy: formatProxy(proxy),
        json: true,
        simple: true,
        gzip: true,
        headers: {
            'User-Agent': userAgent,
        }
    })
    .then((res) => {
        const start = now();
        
        // if products are loaded, let's parse through them
        if (res.products.length > 0) {
            // products loaded, let's parse through them.
            const sortedProducts = _.sortBy(res.products, (product) => {
                return product.updated_at;
            });

            // we want to filter the results based on keywords
            const matchedProducts = _.filter(sortedProducts, function(product) {
                const regex = new RegExp('-', 'g');
                const title = product.title;
                const handle = product.handle.replace(regex, ' ');

                // match every keyword in the positive array
                let pos = _.every(task.product.pos_keywords, function(keyword) {
                    return title.toUpperCase().indexOf(keyword) > -1 || handle.toUpperCase().indexOf(keyword) > -1;
                });
                let neg = false; // defaults
                if (task.product.neg_keywords.length > 0) {
                    // match none of the keywords in the negative array
                    // todo.. this won't work with multiple negative keywords I don't think..?
                    neg = _.some(task.product.neg_keywords, function(keyword) {
                        return title.toUpperCase().indexOf(keyword) > -1 || handle.toUpperCase().indexOf(keyword) > -1;
                    });
                }
                return pos && !neg;
            });
            console.log(`\n[DEBUG]: Matched ${matchedProducts.length} products..`)
            console.log(`\n[DEBUG]: Found product: ${matchedProducts[0].title} \n         Process finding: "${task.product.pos_keywords} ${task.product.neg_keywords}" took ${(now() - start).toFixed(3)}ms\n`);
            if (matchedProducts.length > 0) { // found a product or products!
                if (matchedProducts.length > 1) {
                    // handle this case soon..
                    // maybe choose the first option based on lastmod?
                    // either that or display a list of products that matched somehow..
                    return findProductFromURL(task, proxy);
                } else {
                    return parseVariants(task, matchedProducts[0].variants);
                }
            } else {
                // no products found, show some error to the user.
            }
        } else {
            // let's handle the case where no products are loaded..
        }
    })
    .catch((err) => {
        // todo..
        console.log(err);
    });
}

function parseVariants(task, variants) {
    return _.filter(variants, (variant) => {
        const size = getSizeOption(variant, task.site.url);
        return _.contains(task.sizes, size);
    });
}

function getSizeOption(v, url) {
    return v[urlToSize[url]];
}