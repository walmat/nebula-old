const { pay } = require('./classes/pay');
const { findItem, selectStyle } = require('./classes/findItem');

let supportedSites = []; //pull in the list of supported sites

let config = {
    base_url: 'https://www.yeezysupply.com/sitemap_products_1.xml',
    pos_keywords: ['classified', 'pink']
}

module.exports = async function(config) {

    findItem(config, proxies[index], function(err, delay, res) {

        if (err) {
            setTimeout(() => {
                return run(config);
            }, delay);
        } else {
            selectStyle(config, res, (match, styleID) => {
                pay(config, match, styleID, (err) => {

                    //TODO -- handle moving onto the next user desired size and all that

                    if (err === 'sold out') {
                        return run(config);
                    }
                });
            });
        }
    });
};