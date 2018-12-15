const $ = require('cheerio');
const rfrl = require('./rfrl');

module.exports = {};

const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';
module.exports.userAgent = userAgent;

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
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
  }
  const data = input.split(':');
  if (data.length === 2) {
    return `http://${data[0]}:${data[1]}`;
  }
  if (data.length === 4) {
    return `http://${data[2]}:${data[3]}@${data[0]}:${data[1]}`;
  }
  return null;
}
module.exports.formatProxy = formatProxy;

function autoParse(body, response) {
  // FIXME: The content type string could contain additional values like the charset.
  // Consider using the `content-type` library for a robust comparison.
  if (response.headers['content-type'] === 'application/json') {
    return JSON.parse(body);
  }
  if (response.headers['content-type'] === 'text/html') {
    return $.load(body);
  }
  return body;
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
  const ret = [];
  input.map(word =>
    word
      .trim()
      .substring(1, word.length)
      .toUpperCase(),
  );
  return ret;
}
module.exports.trimKeywords = trimKeywords;

function capitalizeFirstLetter(word) {
  return word
    .toLowerCase()
    .split(' ')
    .map(s => s.charAt(0).toUpperCase() + s.substring(1))
    .join(' ');
}
module.exports.capitalizeFirstLetter = capitalizeFirstLetter;

function generateRandom(objList) {
  const options = objList.options.filter(
    ({ label }) => label !== 'Random' && label !== 'Full Size Run',
  );
  const { value } = options[Math.floor(Math.random() * options.length)];
  return value;
}
module.exports.generateRandom = generateRandom;

// Add in utils from other files
module.exports.rfrl = rfrl;
