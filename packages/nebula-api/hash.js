const crypto = require('crypto');
const { algo, output } = require('./hashConfig.json');

function makeHash(val) {
  return crypto
    .createHash(algo)
    .update(val)
    .digest(output);
}

function hash(alg, license, salt, out) {
  return crypto
    .createHash(alg)
    .update(license)
    .update(makeHash(salt))
    .digest(out);
}

module.exports = { hash };
