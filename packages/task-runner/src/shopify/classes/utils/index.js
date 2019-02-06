const $ = require('cheerio');
const now = require('performance-now');
const rfrl = require('./rfrl');
const { States } = require('./constants').TaskRunner;

const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';

const waitForDelay = delay => new Promise(resolve => setTimeout(resolve, delay));

const stateForStatusCode = statusCode => {
  if (statusCode === 303) {
    return {
      message: 'Waiting in queue',
      nextState: States.PollQueue,
    };
  }
  if (statusCode === 403 || statusCode === 429 || statusCode === 430) {
    return {
      message: 'Swapping proxy',
      nextState: States.SwapProxies,
    };
  }
  return null;
};

const getHeaders = site => {
  const { url, apiKey } = site;
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Connection: 'keep-alive',
    'X-Shopify-Checkout-Version': '2019-10-06',
    'X-Shopify-Access-Token': `${apiKey}`,
    'x-barba': 'yes',
    'User-Agent': userAgent,
    host: `${url.split('/')[2]}`,
    authorization: `Basic ${Buffer.from(`${apiKey}::`).toString('base64')}`,
  };
};

/**
 * Formats the proxy correctly to be used in a request
 * @param {*} input - IP:PORT:USER:PASS || IP:PORT
 * @returns - http://USER:PASS@IP:PORT || http://IP:PORT
 */
const formatProxy = input => {
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
};

const autoParse = (body, response) => {
  // FIXME: The content type string could contain additional values like the charset.
  // Consider using the `content-type` library for a robust comparison.
  if (response.headers['content-type'] === 'application/json') {
    return JSON.parse(body);
  }
  if (response.headers['content-type'] === 'text/html') {
    return $.load(body);
  }
  return body;
};

/**
 * Takes in either the pos_keywords/neg_keywords and trims the
 * +/- off of them while converting them to uppercase ahead of
 * time to be used in string comparison algorithms.
 *
 * @param {Array} input
 * @return {Array} array of trimmed keywords
 */
const trimKeywords = input => {
  const ret = [];
  input.map(word =>
    word
      .trim()
      .substring(1, word.length)
      .toUpperCase(),
  );
  return ret;
};

const capitalizeFirstLetter = word =>
  word
    .toLowerCase()
    .split(' ')
    .map(s => s.charAt(0).toUpperCase() + s.substring(1))
    .join(' ');

const getRandomIntInclusive = (min, max) => {
  const randMin = Math.ceil(min);
  const randMax = Math.floor(max);
  return Math.floor(Math.random() * (randMax - randMin + 1)) + randMin;
};

const reflect = p => p.then(v => ({ v, status: 'fulfilled' }), e => ({ e, status: 'rejected' }));

module.exports = {
  userAgent,
  now,
  waitForDelay,
  stateForStatusCode,
  getHeaders,
  formatProxy,
  autoParse,
  trimKeywords,
  capitalizeFirstLetter,
  getRandomIntInclusive,
  reflect,
  rfrl,
};
