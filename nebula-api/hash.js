var crypto = require('crypto');
const { algo, output } = require('./hashConfig.json');

function makeHash(val) {
    return crypto.createHash(algo).update(val).digest(output);
}

function hash(algo, license, salt, output) {
    return crypto.createHash(algo)
    .update(license)
    .update(makeHash(salt))
    .digest(output);
}

module.exports = { hash };
