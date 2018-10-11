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
    trimKeywords,
    getProductVariantsForSize,
} = require('../utils');

class Monitor {

    /**
     * 
     * @param {Task Object} task 
     * @param {String} proxy 
     */
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
    }

    /**
     * Parses given site's sitemap for the given product
     */
    parseSitemap() {
        rp({
            method: 'GET',
            uri: `${this._task.site.url}/sitemap_products_1.xml`,
            proxy: formatProxy(this._proxy),
            json: false,
            simple: true,
            gzip: true,
            headers: {
                'User-Agent': userAgent,
            }
        })
        .then((body) => {
            const start = now();
            return new Promise((resolve, reject) => {
                parseString(body, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
        })
        .then((res) => {
            console.log(res);
        })
    }

    parseAtom() {
        rp({
            method: 'GET',
            uri: `${this._task.site.url}/collections/all.atom`,
            proxy: formatProxy(this._proxy),
            json: false,
            simple: true,
            gzip: true,
            headers: {
                'User-Agent': userAgent,
            }
        })
        .then((body) => {
            const start = now();
            return new Promise((resolve, reject) => {
                parseString(body, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
        })
        .then((res) => {
            console.log(res);
        });
    }

    /**
     * Fastest way to parse by directly looking at the products file
     * -- may not be available on each site though --
     */
    parseProductsJSON() {
        rp({
            method: 'GET',
            uri: `${this._task.site.url}/products.json`,
            proxy: formatProxy(this._proxy),
            json: false,
            simple: true,
            gzip: true,
            headers: {
                'User-Agent': userAgent,
            }
        })
        .then((res) => {
            const start = now();

            if (res.products.length > 0) {
                const sortedProducts = _.sortBy(res.products, (product) => {
                    return product.updated_at;
                });

                const matchedProducts = _.filter(sortedProducts, (product) => {
                    const title = product.title.toUpperCase();
                    const handle = product.handle.replace(new RegExp('-', 'g'), ' ').toUpperCase();

                    // match every keyword in the positive array
                    let pos = _.every(this._task.product.pos_keywords, (keyword) => {
                        return title.indexOf(keyword) > -1 || handle.indexOf(keyword) > -1;
                    });
                    let neg = false; // defaults
                    if (this._task.product.neg_keywords.length > 0) {
                        // match none of the keywords in the negative array
                        // todo.. this won't work with multiple negative keywords I don't think..?
                        neg = _.some(this._task.product.neg_keywords, (keyword) => {
                            return title.indexOf(keyword) > -1 || handle.indexOf(keyword) > -1;
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
                    // no products considered a "match", let's continue monitoring
                }
            } else {
                // no products are loaded, yet?
            }
        });
    }

}

module.exports = Monitor;