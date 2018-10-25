const _ = require('underscore');

module.exports = {};

const ParseType = {
  Unknown: 'UNKNOWN',
  Variant: 'VARIANT',
  Url: 'URL',
  Keywords: 'KEYWORDS',
};
module.exports.ParseType = ParseType;

/**
 * Determine the type of parsing we need to 
 * perform based the contents of the given 
 * Task Product.
 * 
 * @param {TaskProduct} product 
 */
function getParseType(product) {
  console.log(`[TRACE]: Determining Parse Type for product...\n${JSON.stringify(product)}`);
  if(!product) {
    console.log(`[TRACE]: Product is not defined, returning: ${ParseType.Unknown}`);
    return ParseType.Unknown;
  }

  if (product.variant) {
    console.log(`[TRACE]: Parse Type Determined as: ${ParseType.Variant}`);
    return ParseType.Variant;
  }

  if (product.url) {
    console.log(`[TRACE]: Parse Type Determined as: ${ParseType.Url}`);
    return ParseType.Url;
  }

  if (product.pos_keywords && product.neg_keywords) {
    console.log(`[TRACE]: Parse Type Determined as: ${ParseType.Keywords}`);
    return ParseType.Keywords;
  }

  console.log('[TRACE]: Prase Type could not be determined!');
  return ParseType.Unknown;
}
module.exports.getParseType = getParseType;

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
function filterAndLimit(list, sorter, limit) {
  console.log(`[TRACE]: Filtering given list with sorter: ${sorter} and limit: ${limit} ...`);
  if (!list) {
    console.log('[TRACE]: No list given! returning empty list');
    return [];
  }
  console.log(`[TRACE]: List Detected with ${list.length} elements. Proceeding to sorting now...`);
  let sorted = list;
  if (sorter) {
    console.log('[TRACE]: Sorter detected, sorting...');
    sorted = _.sortBy(list, sorter);
  }

  const _limit = limit || 0;
  if (_limit === 0) {
    console.log('[TRACE]: No limit given! returning...');
    return sorted;
  } else if (_limit > 0) {
    console.log('[TRACE]: Ascending Limit detected, limiting...');
    return sorted.slice(_limit);
  }
  console.log('[TRACE]: Descending Limit detected, limiting...');
  // slice, then reverse elements to get the proper order
  return sorted.slice(0, _limit).reverse();
}
module.exports.filterAndLimit = filterAndLimit;

/**
 * Match a variant id to a product
 * 
 * Take the given list of products and find the product 
 * that contains the given varient id. If no product is 
 * found, this method returns `null`.
 * 
 * NOTE:
 * This method assumes the following:
 * - The products list contains objects that have a "variants" list of 
 *   variants associated with the product
 * - The variant objects contain an id for the variant and a "product_id" key
 *   that maps it back to the associated product
 * 
 * @param {List} products list of products to search
 * @param {String} variantId the variant id to match
 */
function matchVariant(products, variantId) {
  console.log(`[TRACE]: Starting variant matching for variant: ${variantId}`);
  if (!products) {
    console.log('[TRACE]: No product list given! Returning null');
    return null;
  }
  if (!variantId) {
    console.log('[TRACE]: No variant id given! Returning null');
    return null;
  }
  // Step 1: Map products list to a list of variant lists
  // Step 2: flatten the list of lists, so we only have one total list of all variants
  // Step 3: Search for the variant in the resulting variant list
  const matchedVariant = _.find(
    _.flatten(
      _.map(products, p => p.variants)
    ),
    v => v.id.toString() === variantId
  );
  if (matchedVariant) {
    console.log(`[TRACE]: Searched ${products.length} products. Found variant ${variantId}:\n${JSON.stringify(matchedVariant, null, 2)}`);
    console.log('[TRACE]: Returning product associated with this variant...');
    return _.find(products, p => p.id === matchedVariant.product_id);
  }
  console.log(`[TRACE]: Searched ${products.length} products. Variant ${varianId} was not found! Returning null`);
  return null;
}
module.exports.matchVariant = matchVariant;

/**
 * Match a set of keywords to a product
 * 
 * Given a list of products, use a set of keywords to find a 
 * single product that matches the following criteria:
 * - the product's title/handle contains ALL of the positive keywords (`keywords.pos`)
 * - the product's title/handle DOES NOT contain ANY of the negative keywords (`keywords.neg`)
 * 
 * If no product is found, `null` is returned. If multiple products are found, 
 * the products are filtered using the given `filter.sorter` and `filter.limit`. 
 * and the first product is returned. 
 * 
 * If no filter is given, this method returns the most recent product.
 * 
 * See `filterAndLimit` for more details on `sorter` and `limit`.
 * 
 * @param {List} products list of products to search
 * @param {Object} keywords an object containing two arrays of strings (`pos` and `neg`)
 * @see filterAndLimit
 */
function matchKeywords(products, keywords, filter) {
  console.log(`[TRACE]: Starting keyword matching for keywords: ${JSON.stringify(keywords, null, 2)}`);
  if (!products) {
    console.log('[TRACE]: No product list given! Returning null');
    return null;
  }
  if (!keywords) {
    console.log('[TRACE]: No keywords object given! Returning null');
    return null;
  }
  if (!keywords.pos || !keywords.neg) {
    console.log('[TRACE]: Malformed keywords object! Returning null');
    return null;
  }

  const matches = _.filter(products, (product) => {
    const title = product.title.toUpperCase();
    const handle = product.handle.replace(new RegExp('-', 'g'), ' ').toUpperCase();

    // defaults
    let pos = true;
    let neg = false; 

    // match every keyword in the positive array
    if (keywords.pos.length > 0) {
      pos = _.every(keywords.pos.map(k => k.toUpperCase()), (keyword) => {
        return title.indexOf(keyword.toUpperCase()) > -1 || handle.indexOf(keyword) > -1;
      });
    }
    
    // match none of the keywords in the negative array
    if (keywords.neg.length > 0) {
        neg = _.some(keywords.neg.map(k => k.toUpperCase()), (keyword) => {
            return title.indexOf(keyword) > -1 || handle.indexOf(keyword) > -1;
        });
    }
    return pos && !neg;
  });

  if (!matches.length) {
    console.log(`[TRACE]: Searched ${products.length} products. No matches found! Returning null`);
    return null;
  } else if (matches.length > 1) {
    let filtered;
    console.log(`[TRACE]: Searched ${products.length} products. ${matches.length} Products found:\n${JSON.stringify(matches.map(({ title }) => title), null, 2)}`);
    if (filter && filter.sorter && filter.limit) {
      console.log(`[TRACE]: Using given filtering heuristic on the products...`);
      filtered = filterAndLimit(matches, filter.sorter, filter.limit);
      console.log(`[TRACE]: Returning Matched Product: ${filtered[0].title}`);
      return filtered[0];
    }
    console.log(`[TRACE]: No Filter or Invalid Filter Heuristic given! Defaulting to most recent...`);
    filtered = filterAndLimit(matches, 'updated_at', -1);
    console.log(`[TRACE]: Returning Matched Product: ${filtered[0].title}`);
    return filtered[0];
  }
  console.log(`[TRACE]: Searched ${products.length} products. Matching Product Found:\n${matches[0].title}`);
  return matches[0];
}
module.exports.matchKeywords = matchKeywords;