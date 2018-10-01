var crypto = require('crypto');
const { algo, output } = require('./hashConfig.json');

function makeHash(val) {
    return crypto.createHash(algo).update(val).digest(output);
}

module.exports = { makeHash };
