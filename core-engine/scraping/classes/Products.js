const request = require('request');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

let Products = {};

Products.findProducts = function(base_url, proxy, userAgent, callback) {
    request({
        method: 'get',
        url: 'https://' + base_url + '/sitemap_products_1.xml',
        proxy: proxy,
        gzip: true,
        followRedirect: true,
        headers: {
            'User-Agent': userAgent
        }
    }, (error, response, body) => {

        if (error) return callback(error, null);

        if (body.indexOf('Please try again in a couple minutes by refreshing the page') > -1) {

            return callback('Temp Ban Occurred', null);

        } else if (body.indexOf('http://www.sitemaps.org/schemas') > -1) {

            xml2js.parseString(body, (error, result) => {

                if (error || result === undefined) return callback(error, true);

                let products = result['urlset']['url'];
                products.shift();
                console.log(products); //to view
                return callback(null, products);
            })
        }
    });
};

//TEST!!!
Products.findProducts("kith.com", "", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3107.4 Safari/537.36", function(data, msg) {
    console.log(data, msg);
});

module.exports = Products;