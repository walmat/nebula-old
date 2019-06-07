const _ = require('underscore');
const { parseString } = require('xml2js');

const { ProductInputType } = require('./constants');
const { isSpecialSite } = require('./siteOptions');

module.exports = {};

/**
 * Determine the type of parsing we need to
 * perform based the contents of the given
 * Task Product.
 *
 * @param {TaskProduct} product
 */
function getProductInputType(product, logger, site) {
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Determining Parse Type for Product...', product);
  if (!product) {
    _logger.log('silly', 'Product is not defined, returning: %s', ProductInputType.Unknown);
    return ProductInputType.Unknown;
  }

  if (site && isSpecialSite(site)) {
    _logger.log(
      'silly',
      'Special Site found: %s, returning %s',
      site.name,
      ProductInputType.Special,
    );
    return ProductInputType.Special;
  }

  if (product.variant) {
    _logger.log('silly', 'Parse Type determined as %s', ProductInputType.Variant);
    return ProductInputType.Variant;
  }

  if (product.url) {
    _logger.log('silly', 'Parse Type determined as %s', ProductInputType.Url);
    return ProductInputType.Url;
  }

  if (product.pos_keywords && product.neg_keywords) {
    _logger.log('silly', 'Parse Type Determined as %s', ProductInputType.Keywords);
    return ProductInputType.Keywords;
  }

  _logger.log('silly', 'Parse Type could not be determined!');
  return ProductInputType.Unknown;
}
module.exports.getProductInputType = getProductInputType;

/**
 * Filter a list using a sorter and limit
 *
 * Using a given sorter, sort the list and then limit
 * the array by the given limit. The sorter can be a
 * String that is the key to use on each object (e.g. length),
 * or a function that takes an object from the list and
 * returns a value to use when sorting. No sorting will take
 * place if no sorter is given.
 *
 * Limiting can be done in "ascending" or "descending" mode
 * based on the sign of the limit. When using a positive number,
 * the first N values will be chosen ("ascending"). When using
 * a negative number, the last N values will be chosen ("descending").
 * No limiting will take place if 0 or no limit is given.
 *
 * @param {List} list the list to filter
 * @param {Sorter} sorter the method of sorting
 * @param {num} limit the limit to use
 */
function filterAndLimit(list, sorter, limit, logger) {
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
    sorted = _.sortBy(list, sorter);
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
}
module.exports.filterAndLimit = filterAndLimit;

/**
 * Match a list of variant ids to products
 *
 * Take the given list of products and match a product to each variant id
 * given. If no product is found, null will be added to the list.
 *
 * NOTE:
 * This method assumes the following:
 * - The products list contains objects that have a "variants" list of
 *   variants associated with the product
 * - THe variant objects contain an id for the variant and a "product_id" key
 *   that maps it back to the associated product
 *
 * @param {List<Product>} products list of products to search
 * @param {List<String>} variantIds the variant ids to match
 */
function matchVariants(products, variantIds, logger) {
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Starting variant matching for %d variants', variantIds.length);
  if (!products) {
    _logger.log('silly', 'No product list given! Returning empty list');
    return [];
  }

  if (!variantIds) {
    _logger.log('silly', 'No variant ids given! Returning empty list');
    return [];
  }

  // Step 1: Add all variants to a single map (keyed by variant id) from the
  //         list of products
  // Step 2: Search for the variantIds in the resulting variant map
  const trackedProducts = {};
  const trackedVariants = {};
  products.forEach(({ id, variants, ...otherProductData }) => {
    // Sometimes the objects in the variants list don't include a product_id hook
    // back to the associated product. In order to counteract this, we first add
    // this hook in (if it doesn't exist)
    const transformedVariants = variants.map(
      ({ id: variantId, product_id: productId, ...otherVariantData }) => {
        const transformed = {
          ...otherVariantData,
          id,
          product_id: productId || id,
        };
        trackedVariants[variantId] = transformed;
        return transformed;
      },
    );
    trackedProducts[id] = { ...otherProductData, id, variants: transformedVariants };
  });
  let matchedCount = 0;
  const matchedVariants = variantIds.map(vId => {
    const match = trackedVariants[vId];
    if (match) {
      matchedCount += 1;
      return match;
    }
    return null;
  });
  if (matchedCount > 0) {
    _logger.log(
      'silly',
      'Searched %d products. Matched %d/%d variants}',
      products.length,
      matchedCount,
      variantIds.length,
    );
    _logger.log('silly', 'Returning products associated with variants...');
    return matchedVariants.map(v => {
      if (!v) {
        return null;
      }
      return trackedProducts[v.product_id] || null;
    });
  }
  _logger.log(
    'silly',
    'Searched %d products. No matching variants were found! returning empty list...',
    products.length,
  );
  return [];
}
module.exports.matchVariants = matchVariants;

/**
 * Match a list of keyword pairs to a specific product from a given list.
 *
 * Given a list of products, use a set of keywords to find a single product
 * that matches the following criteria:
 * - the product's title/handle contains ALL of the positive keywords
 *   (`keywordPairs[*].pos`)
 * - the product's title/handle DOES NOT contain ANY of the negative keywords
 *   (`keywordPairs[*].neg`)
 *
 * If no product is found, `null` is placed in the returning array at the same
 * index as the keyword pair that could not be matched. If multiple products
 * are found, the products are filtered using the given `filter.sorter` and
 * `filter.limit` options, then the first product is returned.
 *
 * If no filter is given, this method defaults to the most recent product.
 *
 * See `filterAndLimit` for more details on `filter.sorter` and `filter.limit`.
 *
 * @param {List<Product>} products list of products to search
 * @param {List<KeywordPair>} keywordPairs list of keyword pairs (an object
 *                                         containing two arrays of strings,
 *                                         `pos` and `neg`)
 * @param {Object} filter an object containing `sorter` and `limit` options to
 *                        pass to `filterAndLimit`
 * @param {Logger} logger an optional logger for debugging purposes
 */
function matchKeywords(products, keywordPairs = [], filter = {}, logger, returnAll = false) {
  // TODO: Remove the use of returnAll -- this option is already available via the filter option
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Starting keyword matching for %d keyword pairs', keywordPairs.length);
  if (!products) {
    _logger.log('silly', 'No product list given! Returning empty list');
    return [];
  }
  if (!keywordPairs || keywordPairs.length === 0) {
    _logger.log('silly', 'No Keyword pairs given! Returning empty list');
    return [];
  }
  const matchedProducts = [];
  // TODO: Refactor this to be more efficient!
  keywordPairs.forEach(pair => {
    _logger.log('silly', 'Performing matching for pair: %j', pair);
    if (!pair.pos || !pair.neg) {
      _logger.log('silly', 'Pair does not contain correct format (pos/neg properties), skipping');
      matchedProducts.push(null);
      return;
    }

    const matches = _.filter(products, product => {
      // Get details for product (assign a default handle in case it doesn't exist on the product)
      const { title, handle: rawHandle } = { handle: '', ...product };
      const handle = rawHandle.replace(new RegExp('-', 'g'), ' ');

      // defaults
      let pos = true;
      let neg = false;

      // match every keyword in the positive array
      if (pair.pos.length > 0) {
        pos = _.every(pair.pos, keyword => {
          const kwRegex = new RegExp(`${keyword}`, 'i');
          return title.match(kwRegex) || handle.match(kwRegex);
        });
      }

      // match none of the keywords in the negative array
      if (pair.neg.length > 0) {
        neg = _.some(pair.neg, keyword => {
          const kwRegex = new RegExp(`${keyword}`, 'i');
          return title.match(kwRegex) || handle.match(kwRegex);
        });
      }
      return pos && !neg;
    });

    if (!matches.length) {
      _logger.log('silly', 'Searched %d products. No matches found!', products.length);
      matchedProducts.push(null);
      return;
    }
    if (matches.length > 1) {
      let filtered;
      _logger.log(
        'silly',
        'Searched %d products. %d Products Found',
        products.length,
        matches.length,
        JSON.stringify(matches.map(({ title }) => title), null, 2),
      );
      if (filter.sorter && filter.limit) {
        _logger.log('silly', 'Using given filtering heuristic on the products...');
        if (returnAll) {
          _logger.log('silly', "Overriding filter's limit and returning all products...");
          filtered = filterAndLimit(matches, filter.sorter, 0, this._logger);
          _logger.log('silly', 'Returning %d Matched Products', filtered.length);
          matchedProducts.push(filtered);
          return;
        }
        filtered = filterAndLimit(matches, filter.sorter, filter.limit, this._logger);
        _logger.log('silly', 'Returning Matched Product: %s', filtered[0].title);
        matchedProducts.push(filtered[0]);
        return;
      }
      _logger.log(
        'silly',
        'No Filter or Invalid Filter Heuristic given! Defaulting to most recent...',
      );
      if (returnAll) {
        _logger.log('silly', 'Returning all products...');
        filtered = filterAndLimit(matches, 'updated_at', 0, this._logger);
        _logger.log('silly', 'Returning %d Matched Products', filtered);
        matchedProducts.push(filtered);
        return;
      }
      filtered = filterAndLimit(matches, 'updated_at', -1, this._logger);
      _logger.log('silly', 'Returning Matched Product: %s', filtered[0].title);
      matchedProducts.push(filtered[0]);
      return;
    }
    _logger.log(
      'silly',
      'Searched %d products. Matching Product Found: %s',
      products.length,
      matches[0].title,
    );
    matchedProducts.push(returnAll ? matches : matches[0]);
  });
  return matchedProducts;
}
module.exports.matchKeywords = matchKeywords;

/**
 * Convert an XML String to JSON
 *
 * This method proxies the xml2js parseString method,
 * but converts it to a promisified form.
 *
 * @param {String} xml
 */
function convertToJson(xml) {
  return new Promise((resolve, reject) => {
    parseString(xml, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
module.exports.convertToJson = convertToJson;
