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
    trimKeywords,
    userAgent,
} = require('../utils/common');

module.exports = {};

/**
 * Based on the task method, find the product
 * @param {TaskObject} task encapsulates the entire user data for the task
 * @param {String} proxy 
 */
async function findProduct(task, proxy,) {
    return task.product.url !== null ? findProductFromURL(task, proxy) :
    task.product.variant !== null ? findProductFromVariant(task, proxy) :
    task.product.pos_keywords !== null ? findProductFromKeywords(task, proxy) :
    null;
}

module.exports.findProduct = findProduct;

async function findProductFromVariant(task, proxy) {
    rp(
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
    }).then (async function(body) {
        let products = JSON.parse(JSON.stringify(body));
        return new Promise(async (resolve) => {
            // gather essentials needed for checking out
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
                resolve({error: false, delay: task.monitorDelay, products: product});
            }
        });
    });
}

/**
 * Monitors an enpoint 
 * @param {TaskObject} task encapsulates the entire user data for the task
 * @param {String} proxy 
 */
async function findProductFromKeywords(task, proxy) {

    let matchedProducts = []; // ideally only one product...

    /**
     * Send request to the sitemap
     * @param {String} method 'GET'
     * @param {String} url e.g. - https://blendsus.com/sitemap_products_1.xml
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
        let products = _.sortBy(res['urlset']['url'], (product) => {
            return product.lastmod;
        });
        products.forEach(product => {
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
                    // https://underscorejs.org/#some
                    let neg = _.some(trimKeywords(task.product.neg_keywords), function(keyword) {
                        return title[0].indexOf(keyword) > -1;
                    });
                    if (pos && !neg) {
                        matchedProducts.push(product.loc);
                    }
                }
            }
        });

        console.log(`\n[DEBUG]: Found product(s): ${matchedProducts} \n         Process finding: "${task.product.pos_keywords} ${task.product.neg_keywords}" took ${(now() - start).toFixed(3)}ms\n`);

        if (matchedProducts.length > 0) { // found a product or products!
            return JSON.parse(JSON.stringify({ error: null, delay: task.monitorDelay, products: matchedProducts }));
        } else { // keep monitoring
            return JSON.parse(JSON.stringify({ error: null, delay: task.monitorDelay, products: null }));
        }
    })
    .then((res) => {
        if (res.error) {
            console.log(res.error);
        }

        task.product.url = res.products[0];

        return new Promise((resolve) => {
            findProductFromURL(task, proxy).then((res) => {
                resolve(res);
            });
        })
    });
}

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