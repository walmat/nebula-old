/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */
import { filter, every, some, sortBy } from 'lodash';

import { getRandomIntInclusive } from '../../common';
import { Regions } from './constants';

export default () => ({
  authority: 'www.supremenewyork.com',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
  origin: 'https://www.supremenewyork.com',
  referer: 'https://www.supremenewyork.com/mobile',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'en-US,en;q=0.9',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': 1,
  'user-agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
});

export const filterAndLimit = async (list, sorter, limit, logger) => {
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Filtering given list with sorter: %s and limit: %d ...', sorter, limit);
  if (!list) {
    _logger.log('silly', 'No list given! returning empty list');
    return [];
  }
  _logger.log('silly', 'List Detected with %d elements. Proceeding to sorting now...', list.length);
  let sorted = list;
  if (sorter) {
    _logger.log('silly', 'Sorter detected, sorting...');
    sorted = sortBy(list, sorter);
  }

  const _limit = limit || 0;
  if (_limit === 0) {
    _logger.log('silly', 'No limit given! returning...');
    return sorted;
  }
  if (_limit > 0) {
    _logger.log('silly', 'Ascending Limit detected, limiting...');
    return sorted.slice(_limit);
  }
  _logger.log('silly', 'Descending Limit detected, limiting...');
  // slice, then reverse elements to get the proper order
  return sorted.slice(0, _limit).reverse();
};

export const matchKeywords = async (products, keywords, _filter, logger, returnAll = false) => {
  const _logger = logger || { log: () => {} };
  _logger.log(
    'silly',
    'Starting keyword matching for keywords: %s',
    JSON.stringify(keywords, null, 2),
    keywords,
  );
  if (!products) {
    _logger.log('silly', 'No product list given! Returning null');
    return null;
  }
  if (!keywords) {
    _logger.log('silly', 'No keywords object given! Returning null');
    return null;
  }
  if (!keywords.pos || !keywords.neg) {
    _logger.log('silly', 'Malformed keywords object! Returning null');
    return null;
  }

  const matches = filter(products, product => {
    const name = product.name.toUpperCase();

    // defaults
    let pos = true;
    let neg = false;

    if (keywords.pos.length) {
      pos = every(
        keywords.pos.map(k => k.toUpperCase()),
        keyword => name.indexOf(keyword.toUpperCase()) > -1,
      );
    }

    if (keywords.neg.length) {
      neg = some(keywords.neg.map(k => k.toUpperCase()), keyword => name.indexOf(keyword) > -1);
    }

    return pos && !neg;
  });

  if (!matches || (matches && !matches.length)) {
    _logger.log('silly', 'Searched %d products. No matches found! Returning null', products.length);
    return null;
  }

  if (matches.length > 1) {
    let filtered;
    _logger.log(
      'silly',
      'Searched %d products. %d Products Found',
      products.length,
      matches.length,
      JSON.stringify(matches.map(({ name }) => name), null, 2),
    );
    if (_filter && _filter.sorter && _filter.limit) {
      _logger.log('silly', 'Using given filtering heuristic on the products...');
      let { limit } = _filter;
      if (returnAll) {
        _logger.log('silly', "Overriding filter's limit and returning all products...");
        limit = 0;
      }
      filtered = await filterAndLimit(matches, _filter.sorter, limit, this._logger);
      if (!returnAll) {
        _logger.log('silly', 'Returning Matched Product: %s', filtered[0].name);
        return filtered[0];
      }
      _logger.log('silly', 'Returning %d Matched Products', filtered.length);
      return filtered;
    }
    _logger.log(
      'silly',
      'No Filter or Invalid Filter Heuristic given! Defaulting to most recent...',
    );
    if (returnAll) {
      _logger.log('silly', 'Returning all products...');
      filtered = await filterAndLimit(matches, 'position', 0, this._logger);
      _logger.log('silly', 'Returning %d Matched Products', filtered);
      return filtered;
    }
    filtered = await filterAndLimit(matches, 'position', -1, this._logger);
    _logger.log('silly', 'Returning Matched Product: %s', filtered[0].name);
    return filtered[0];
  }
  _logger.log(
    'silly',
    'Searched %d products. Matching Product Found: %s',
    products.length,
    matches[0].name,
  );
  return returnAll ? matches : matches[0];
};

export const matchVariation = async (variations, variation, logger = { log: () => {} }) => {
  if (/random/i.test(variation)) {
    const rand = getRandomIntInclusive(0, variations.length - 1);
    const variant = variations[rand];
    return variant;
  }

  return variations.find(v => {
    const { name } = v;
    let variationMatcher;
    if (/[0-9]+/.test(name)) {
      // We are matching a shoe size
      variationMatcher = s => new RegExp(`${name}`, 'i').test(s);
    } else {
      // We are matching a garment size
      variationMatcher = s => !/[0-9]+/.test(s) && new RegExp(`^${name}`, 'i').test(s.trim());
    }

    if (variationMatcher(variation)) {
      logger.log('debug', 'Choosing variant: %j', v);
      return v;
    }
  });
};

export const getRegion = name => {
  let region = Regions.US;
  if (/EU/i.test(name)) {
    region = Regions.EU;
  }
  if (/JP/i.test(name)) {
    region = Regions.JP;
  }
  return region;
};
