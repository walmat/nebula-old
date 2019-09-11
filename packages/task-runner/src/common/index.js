const now = require('performance-now');
const delay = require('delay');
const rfrl = require('./rfrl');

const waitForDelay = (time, signal) => delay(time, { signal });
const reflect = p => p.then(v => ({ v, status: 'fulfilled' }), e => ({ e, status: 'rejected' }));
const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';

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

const currencyWithSymbol = (price, name) => {
  switch (name) {
    case 'usd':
    case 'USD': {
      return `$${price}`;
    }
    case 'cad':
    case 'CAD': {
      return `$${price} CAD`;
    }
    case 'eur':
    case 'EUR': {
      return `€${price}`;
    }
    case 'gbp':
    case 'GBP': {
      return `£${price}`;
    }
    default: {
      return price;
    }
  }
};

module.exports = {
  now,
  rfrl,
  waitForDelay,
  reflect,
  userAgent,
  trimKeywords,
  getRandomIntInclusive,
  capitalizeFirstLetter,
  currencyWithSymbol,
};
