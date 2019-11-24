import now from 'performance-now';
import delay from 'delay';

import rfrl from './rfrl';
import { createLogger } from './logger';
import ProxyManager from './proxyManager';
import WebhookManager from './webhookManager';

const waitForDelay = (time, signal) => delay(time, { signal });
const reflect = p => p.then(v => ({ v, status: 'fulfilled' }), e => ({ e, status: 'rejected' }));
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; LCTE; rv:11.0) like Gecko';

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

export {
  now,
  rfrl,
  waitForDelay,
  reflect,
  userAgent,
  trimKeywords,
  getRandomIntInclusive,
  capitalizeFirstLetter,
  currencyWithSymbol,
  ProxyManager,
  WebhookManager,
  createLogger,
};
