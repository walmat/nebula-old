/**
 * parsing includes
 */
const _ = require('underscore');
const parseString = require('xml2js').parseString;
const cheerio = require('cheerio');

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

const parseStringPromisified = (body) => new Promise((resolve, reject) => {
    parseString(body, (err, res) => {
        if (err) {
            reject(err);
        }
        resolve(res);
    });
});

/**
 * Parses given site's `collections/all.atom` for the desired product
 */
const parseAtom = async (body) => {
    // Should be the same format as sitemap.xml, but need to verify this
    // TODO Verify this!
    return parseSitemap(body);
};

/**
 * Parses a given site's `product.oembed` product data.
 */
const parseOembed = async (res) => {
    // Should be same format as product.json
    // TODO Verify this!
    return parseProduct(res);
};

/**
 * Fastest way to parse by directly looking at the products file
 * -- may not be available on each site though --
 */
const parseProducts = async (res) => {
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
                // handle this case..
                // maybe choose the first option based on last modified?
                // either that or display a list of products that matched somehow..
            } else {
                return parseVariants(task, matchedProducts[0].variants);
            }
        } else {
            // no products considered a "match", let's continue monitoring
        }
    } else {
        // no products are loaded, yet?
    }
};

/**
 * Parses given site's sitemap for the given product
 */
const parseSitemap = async (body) => {
    const res = await parseStringPromisified(body);

    // TODO Filter response to find product...
    const product = await filterSitemap(res);

    // return parse product response
    return parseProduct(product);
};

/**
 * Parses given site's sitemap for the given product
 */
function parseSitemapXml() {
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
        return parseSitemap(body);
    })
    .then((res) => {
        console.log(res);
    })
}

/**
 * Parses given site's `collections/all.atom` for the desired product
 */
function parseAtomCollection() {
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
        return parseAtom(body);
    })
    .then((res) => {
        console.log(res);
    });
}

/**
 * Fastest way to parse by directly looking at the products file
 * -- may not be available on each site though --
 */
function parseProductsJSON() {
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
        return parseProducts(res);
    });
}

/**
 * Same as products.json, but uses ombed (same format)
 * -- may not be available on each site though --
 * -- THIS IS NOT POSSIBLE GIVEN THE CURRENT TASK DATA --
 * The current task data has no way to get to the product site, so we can't create the oembed link.
 * 
 * This should be removed until it is supported
 */
// parseProductsOembed() {
//     // TODO construct product link...
//     const uri = `${this._task.site.url}/products.oembed TODO`;
//     rp({
//         method: 'GET',
//         uri: uri,
//         proxy: formatProxy(this._proxy),
//         json: false,
//         simple: true,
//         gzip: true,
//         headers: {
//             'User-Agent': userAgent,
//         }
//     })
//     .then((res) => {
//         const start = now();
//         return parse.oembed(res);
//     });
// }

module.exports = {
    atom: parseAtom,
    oembed: parseOembed,
    products: parseProducts,
    sitemap: parseSitemap,
};
