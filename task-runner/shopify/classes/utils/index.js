const _ = require('underscore');
const urlToSize = require('./urlToSize');

module.exports = {};

const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';
module.exports.userAgent = userAgent;

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
module.exports.formatProxy = formatProxy;

/**
 * Takes in either the pos_keywords/neg_keywords and trims the
 * +/- off of them while converting them to uppercase ahead of
 * time to be used in string comparison algorithms.
 * 
 * @param {Array} input 
 * @return {Array} array of trimmed keywords
 */
function trimKeywords(input) {
    let ret = [];
    input.map(word => {
        ret.push(word.substring(1, word.length).trim().toUpperCase()); //trim() just in case, probably not necessary
    });
    return ret;
}
module.exports.trimKeywords = trimKeywords;

/**
 * Attempts to get the variants that corresponsds to the given user's sizes
 * @param {TaskObject} task - the task being run
 * @param {Object} variants - variant options for the given product
 * 
 * @return {Object} variants that correspond to the correct US sizes
 */
function getProductVariantsForSize(task, variants) {
    return _.filter(variants, (variant) => {
        const size = getSizeOption(variant, task.site.url);
        return _.contains(task.sizes, size);
    });
}
module.exports.getProductVariantsForSize = getProductVariantsForSize;

/**
 * Maps the proper option for the given URL for each variant
 * e.g - For https://www.blendsus.com/collections/adidas/products/adidas-womens-falcon-cloud-white-blue.json
 *       the `option1` entry is used to tell the size
 * @param {Object} v - variant objects
 * @param {String} url - URL that the task is being ran on
 */
function getSizeOption(v, url) {
    return v[urlToSize[url]];
}