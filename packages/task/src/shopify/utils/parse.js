import { sortBy, map, find, flatten, filter, every, some } from 'lodash';
import { parseString } from 'xml2js';

import { Utils, Constants } from '../../common';

const { Monitor, ErrorCodes } = Constants;

const { ParseType } = Monitor;
const { userAgent, rfrl } = Utils;

/**
 * Determine the type of parsing we need to
 * perform based the contents of the given
 * Task Product.
 *
 * @param {TaskProduct} product
 */
export function getParseType(product) {
  if (!product) {
    return ParseType.Unknown;
  }

  if (product.variant) {
    return ParseType.Variant;
  }

  if (product.url) {
    return ParseType.Url;
  }

  if (product.pos && product.neg) {
    return ParseType.Keywords;
  }

  return ParseType.Unknown;
}

/**
 * Retrieve the full product info for a given product
 *
 * This method takes a given single product url and attempts to
 * get the full info for the product, filling in the gaps missed
 * by xml or atom parsing. This method sends out two requests,
 * one for the `.js` file and one for the `.oembed` file. The
 * first request to complete returns the full product info. If
 * both requests error out, a list of errors is returned.
 *
 * @param {node-fetch instance} fetch
 * @param {String} url
 * @param {Object} proxy
 * @param {Object} logger
 */
export const getFullProductInfo = (fetch, url, proxy, logger) => {
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Parser: Getting Full Product Info...');
  _logger.log('silly', 'Parser: Requesting %s.(js|oembed) in a race', url);
  const genRequestPromise = productUrl =>
    fetch(productUrl, {
      method: 'GET',
      redirect: 'follow',
      follow: 1,
      compress: true,
      agent: proxy ? proxy.proxy : null,
      headers: {
        'user-agent': userAgent,
      },
    });

  return rfrl(
    [
      genRequestPromise(`${url}.js`).then(
        // {productUrl}.js contains the format we need -- just return it
        async res => {
          if (!res.ok) {
            const err = new Error(res.message);
            err.status = res.status || 404;
            err.name = res.name;
            throw err;
          }
          return res.json();
        },
        async error => {
          if (error && error.type && /system/i.test(error.type)) {
            const rethrow = new Error(error.errno);
            rethrow.status = error.code;
            throw rethrow;
          }
          // Error occured, return a rejection with the status code attached
          const err = new Error(error.message);
          err.status = error.status || 404;
          err.name = error.name;
          throw err;
        },
      ),
      genRequestPromise(`${url}.oembed`).then(
        async res => {
          if (!res.ok) {
            // Error occured, return a rejection with the status code attached
            const err = new Error(res.message);
            err.status = res.status || 404;
            err.name = res.name;
            throw err;
          }
          // {productUrl}.oembed requires a little transformation before returning:
          const json = await res.json();

          return {
            title: json.title,
            vendor: json.provider,
            handle: json.product_id,
            featured_image: json.thumbnail_url,
            variants: json.offers.map(offer => ({
              title: offer.title,
              id: offer.offer_id,
              price: `${offer.price}`,
              available: offer.in_stock || false,
            })),
          };
        },
        async error => {
          if (error && error.type && /system/i.test(error.type)) {
            const rethrow = new Error(error.errno);
            rethrow.status = error.code;
            throw rethrow;
          }
          // Error occured, return a rejection with the status code attached
          const err = new Error(error.message);
          err.status = error.status || 404;
          err.name = error.name;
          throw err;
        },
      ),
    ],
    `info - ${url}`,
    _logger,
  );
};

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
export const filterAndLimit = (list, sorter, limit, logger) => {
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
export const matchVariant = (products, variantId, logger) => {
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Starting variant matching for variant: %s', variantId);
  if (!products) {
    _logger.log('silly', 'No product list given! Returning null');
    return null;
  }
  if (!variantId) {
    _logger.log('silly', 'No variant id given! Returning null');
    return null;
  }
  // Sometimes the objects in the variants list don't include a product_id hook back to the associated product.
  // In order to counteract this, we first add this hook in (if it doesn't exist)
  const transformedProducts = products.map(({ id, variants, ...otherProductData }) => {
    const transformedVariants = variants.map(({ product_id: productId, ...otherVariantData }) => ({
      ...otherVariantData,
      product_id: productId || id,
    }));
    return {
      ...otherProductData,
      id,
      variants: transformedVariants,
    };
  });

  // Step 1: Map products list to a list of variant lists
  // Step 2: flatten the list of lists, so we only have one total list of all variants
  // Step 3: Search for the variant in the resulting variant list
  const matchedVariant = find(
    flatten(map(transformedProducts, p => p.variants)),
    v => v.id.toString() === variantId,
  );
  if (matchedVariant) {
    _logger.log(
      'silly',
      'Searched %d products. Found variant %s}',
      transformedProducts.length,
      variantId,
    );
    _logger.log('silly', 'Returning product associated with this variant...');
    return find(transformedProducts, p => p.id === matchedVariant.product_id);
  }
  _logger.log(
    'silly',
    'Searched %d products. Variant %s was not found! Returning null',
    products.length,
    variantId,
  );
  return null;
};

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
export const matchKeywords = (products, keywords, _filter, logger, returnAll) => {
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
    const title = product.title.toUpperCase();
    const { body_html: bodyHtml } = product;
    const rawHandle = product.handle || '';
    const handle = rawHandle.replace(new RegExp('-', 'g'), ' ').toUpperCase();

    // defaults
    let pos = true;
    let neg = false;

    // match every keyword in the positive array
    if (keywords.pos.length > 0) {
      pos = every(keywords.pos.map(k => k.toUpperCase()), keyword => {
        if (title) {
          return title.indexOf(keyword.toUpperCase()) > -1;
        }

        if (handle) {
          return handle.indexOf(keyword.toUpperCase()) > -1;
        }

        if (bodyHtml) {
          return bodyHtml.toUpperCase().indexOf(keyword.toUpperCase()) > -1;
        }

        return false;
      });
    }

    // match none of the keywords in the negative array
    if (keywords.neg.length > 0) {
      neg = some(keywords.neg.map(k => k.toUpperCase()), keyword => {
        if (title) {
          return title.indexOf(keyword.toUpperCase()) > -1;
        }

        if (handle) {
          return handle.indexOf(keyword.toUpperCase()) > -1;
        }

        if (bodyHtml) {
          return bodyHtml.toUpperCase().indexOf(keyword.toUpperCase()) > -1;
        }

        return false;
      });
    }
    return pos && !neg;
  });

  if (!matches.length) {
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
      JSON.stringify(matches.map(({ title }) => title), null, 2),
    );
    if (_filter && _filter.sorter && _filter.limit) {
      _logger.log('silly', 'Using given filtering heuristic on the products...');
      let { limit } = _filter;
      if (returnAll) {
        _logger.log('silly', "Overriding filter's limit and returning all products...");
        limit = 0;
      }
      filtered = filterAndLimit(matches, _filter.sorter, limit, _logger);
      if (!returnAll) {
        _logger.log('silly', 'Returning Matched Product: %s', filtered[0].title);
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
      filtered = filterAndLimit(matches, 'updated_at', 0, _logger);
      _logger.log('silly', 'Returning %d Matched Products', filtered);
      return filtered;
    }
    filtered = filterAndLimit(matches, 'updated_at', -1, _logger);
    _logger.log('silly', 'Returning Matched Product: %s', filtered[0].title);
    return filtered[0];
  }
  _logger.log(
    'silly',
    'Searched %d products. Matching Product Found: %s',
    products.length,
    matches[0].title,
  );
  return returnAll ? matches : matches[0];
};

/**
 * Convert an XML String to JSON
 *
 * This method proxies the xml2js parseString method,
 * but converts it to a promisified form.
 *
 * @param {String} xml
 */
export const convertToJson = xml =>
  new Promise((resolve, reject) => {
    parseString(xml, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });

export const match = (context, products) => {
  const { parseType, logger, task } = context;
  logger.silly('Starting match for parse type: %j', parseType);
  switch (parseType) {
    case ParseType.Variant: {
      const product = matchVariant(products, task.product.variant, null, logger);
      if (!product) {
        logger.silly('Unable to find matching product!');
        const error = new Error('ProductNotFound');
        error.status = ErrorCodes.ProductNotFound;
        throw error;
      }
      logger.silly('Product found!');
      return product;
    }
    case ParseType.Keywords: {
      const keywords = {
        pos: task.product.pos,
        neg: task.product.neg,
      };

      const product = matchKeywords(products, keywords, null, logger, false); // no need to use a custom filter at this point...
      if (!product) {
        logger.silly('Unable to find matching product!');
        const error = new Error('ProductNotFound');
        error.status = ErrorCodes.ProductNotFound;
        throw error;
      }
      logger.silly('Product found!');
      return product;
    }
    default: {
      logger.silly('Invalid parsing type %s!', parseType);
      const error = new Error('InvalidParseType');
      error.status = ErrorCodes.InvalidParseType;
      throw error;
    }
  }
};
