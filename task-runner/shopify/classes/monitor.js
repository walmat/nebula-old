/**
 * generic includes
 */
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

/**
 * utils includes
 */
const now = require("performance-now");
const {
    formatProxy,
    userAgent,
    trimKeywords,
    getProductVariantsForSize,
} = require('./utils');
const parse = require('./utils/parse');

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
            return parse.sitemap(body);
        })
        .then((res) => {
            console.log(res);
        })
    }

    /**
     * Parses given site's `collections/all.atom` for the desired product
     */
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
            return parse.atom(body);
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
            return parse.product(res);
        });
    }

    /**
     * Same as products.json, but uses ombed (same format)
     * -- may not be available on each site though --
     */
    parseProductsOembed() {
        // TODO construct product link...
        const uri = `${this._task.site.url}/products.oembed TODO`;
        rp({
            method: 'GET',
            uri: uri,
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
            return parse.oembed(res);
        });
    }

    run() {
        
    }

}

module.exports = Monitor;