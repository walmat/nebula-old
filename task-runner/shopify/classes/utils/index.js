const rfrl = require('./rfrl');
const $ = require('cheerio');

module.exports = {};

const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';
module.exports.userAgent = userAgent;

const now = require('performance-now');
module.exports.now = now;

const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
});
module.exports.formatter = formatter;

function waitForDelay(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
}
module.exports.waitForDelay = waitForDelay;

/**
 * Formats the proxy correctly to be used in a request
 * @param {*} input - IP:PORT:USER:PASS || IP:PORT
 * @returns - http://USER:PASS@IP:PORT || http://IP:PORT
 */
function formatProxy(input) {

    // safeguard for if it's already formatted or in a format we can't handle
    if (!input || input.startsWith('http') || input === 'localhost') {
        return input;
    } else {
        let data = input.split(':');
        return (data.length === 2) ? 'http://' + data[0] + ':' + data[1] :
               (data.length === 4) ? 'http://' + data[2] + ':' + data[3] + '@' + data[0] + ':' + data[1] :
               null;
    }
}
module.exports.formatProxy = formatProxy;

function autoParse(body, response, resolveWithFullResponse) {
    // FIXME: The content type string could contain additional values like the charset.
    // Consider using the `content-type` library for a robust comparison.
    if (response.headers['content-type'] === 'application/json') {
        return JSON.parse(body);
    } else if (response.headers['content-type'] === 'text/html') {
        return $.load(body);
    } else {
        return body;
    }
}
module.exports.autoParse = autoParse;

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

function capitalizeFirstLetter(word) {
    return word.toLowerCase()
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join(' ');
}
module.exports.capitalizeFirstLetter = capitalizeFirstLetter;

// Add in utils from other files
module.exports.rfrl = rfrl;

const reflect = p =>
  p.then(v =>({v, status: "fulfilled" }),
    e => ({e, status: "rejected" }));
module.exports.reflect = reflect;
