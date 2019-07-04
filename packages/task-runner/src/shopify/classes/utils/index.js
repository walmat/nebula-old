const delay = require('delay');
const now = require('performance-now');

const $ = require('cheerio');

const rfrl = require('./rfrl');
const { States } = require('./constants').TaskRunner;

const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';

const waitForDelay = (time, signal) => delay(time, { signal });

const stateForError = ({ statusCode, code }, { message, nextState }) => {
  // Look for errors in cause
  const match = /(ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT)/.exec(code);

  if (match) {
    // Check capturing group
    switch (match[1]) {
      // connection reset
      case 'ECONNRESET': {
        return {
          message: 'Swapping proxy',
          shouldBan: 0, // just swap with no ban
          nextState: States.SwapProxies,
        };
      }
      // request timeout or socket freeze timeout
      case 'ETIMEDOUT':
      case 'ESOCKETTIMEDOUT': {
        return { message, nextState };
      }
      default: {
        break;
      }
    }
  }

  // Check request status code
  let shouldBan = 0;
  switch (statusCode) {
    case 403:
    case 429:
    case 430: {
      shouldBan = statusCode === 403 ? 2 : 1;
      return {
        message: `Swapping proxy - (${statusCode})`,
        shouldBan,
        nextState: States.SwapProxies,
      };
    }
    case 303: {
      return {
        message: 'Waiting in queue - (303)',
        nextState: States.PollQueue,
      };
    }
    default: {
      return statusCode >= 500
        ? {
            message: `${message} - (${statusCode})`,
            nextState,
          }
        : null;
    }
  }
};

const getHeaders = ({ url, apiKey }) => ({
  'X-Shopify-Checkout-Version': '2019-10-06',
  'X-Shopify-Access-Token': `${apiKey}`,
  'x-barba': 'yes',
  'User-Agent': userAgent,
  host: `${url.split('/')[2]}`,
  authorization: `Basic ${Buffer.from(`${apiKey}::`).toString('base64')}`,
});

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

const capitalizeFirstLetter = sentence =>
  sentence
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
  stateForError,
  getHeaders,
  autoParse,
  trimKeywords,
  capitalizeFirstLetter,
  getRandomIntInclusive,
  reflect,
  rfrl,
};
