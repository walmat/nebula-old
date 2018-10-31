const _ = require('underscore');

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
