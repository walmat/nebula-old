/**
 * a class that contains global common elements
 * @type {{}}
 */

module.exports = {};

/**
 * Helper method to format the proxies properly for use
 * @param str
 * @returns {*}
 */
function formatProxy(str) {
    //format is ip:port:user:pass
    let data = str.split(':');

    if (data.length === 2) {
        return 'http://' + data[0] + ':' + data[1]; //proxy with no user/pass
    } else if (data.length === 4) {
        return 'http://' + data[2] + ':' + data[3] + '@' + data[0] + ':' + data[1];
    } else {
        console.log('Unable to parse proxy');
        return null;
    }
}

module.exports.formatProxy = formatProxy;