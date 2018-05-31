const log = require('./utils/log');

// INIT PROXIES - NEED TO LOAD PROXIES FROM DB
var proxies = [];
let index = 0;

const { pay } = require('./classes/pay');
const { findItem, selectStyle } = require('./classes/findItem');

function run(config) {

    if (index >= proxies.length) {
        index = 0;
    }

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
}

module.exports.run = run;
