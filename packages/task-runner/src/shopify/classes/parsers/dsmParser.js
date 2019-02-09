/* eslint-disable class-methods-use-this */
const SpecialParser = require('./specialParser');
const { ParseType, matchKeywords } = require('../utils/parse');
const ErrorCodes = require('../utils/constants').ErrorCodes.Parser;

/**
 * NY: <input type="hidden" name="properties[_HASH]" />
 * L: <input type="hidden" name="properties[_hash]" />
 */
const HashRegexes = {
  'DSM US': /\$\(\s*atob\(\s*'PGlucHV0IHR5cGU9ImhpZGRlbiIgbmFtZT0icHJvcGVydGllc1tfSEFTSF0iIC8\+'\s*\)\s*\)\s*\.val\(\s*'(.+)'\s*\)/,
  'DSM UK': /\$\(\s*atob\(\s*'PGlucHV0IHR5cGU9ImhpZGRlbiIgbmFtZT0icHJvcGVydGllc1tfaGFzaF0iIC8\+'\s*\)\s*\)\s*\.val\(\s*'(.+)'\s*\)/,
};

/**
 * Special Parser for all DSM sites
 */
class DsmParser extends SpecialParser {
  constructor(request, task, proxy, logger) {
    super(request, task, proxy, logger, 'DsmParser');

    /**
     *
     * Map of { id: hash }
     */
    this._hashIds = {};
  }

  get initialPageContainsProducts() {
    return false;
  }

  parseInitialPageForUrls($) {
    // Look for all `.grid-view-item`'s
    const parsedItems = [];
    $('.grid-view-item').each((i, el) => {
      const link = $('.grid-view-item__link', el).attr('href');
      const title = $('.grid-view-item__title', el).text();

      if (!link || !title) {
        return;
      }
      parsedItems.push({ link, title });
    });

    let items = parsedItems;
    // If parsing keywords, reduce the number of pages to search by matching the title
    if (this._type === ParseType.Keywords && items.length !== 0) {
      const keywords = {
        pos: this._task.product.pos_keywords,
        neg: this._task.product.neg_keywords,
      };
      items = matchKeywords(parsedItems, keywords, null, null, true) || [];
    }
    this._logger.silly('%s: parsing inital page, found %d items', this._name, items.length);

    if (!items.length) {
      // If no products are found, throw an error, but specify a special status to stop the task
      // TODO: Maybe replace with a custom error object?
      const error = new Error('No Items Found');
      error.status = ErrorCodes.ProductNotFound;
      throw error;
    }

    // Convert items to full urls
    const productUrls = items.map(({ link }) => new URL(link, this._task.site.url).href);

    return productUrls;
  }

  parseProductInfoPageForProduct($) {
    // Look for the script tag containing the product json
    const product = $('script#ProductJson-product-template');
    if (!product || product.attr('type') !== 'application/json') {
      // If no products are found, throw an error, but specify a special status to stop the task
      // TODO: Maybe replace with a custom error object?
      const error = new Error('No Items Found');
      error.status = ErrorCodes.ProductNotFound;
      throw error;
    }

    const parsedProduct = JSON.parse(product.html());

    // Calcalate and store hash for this product
    const hash = this.parseProductInfoPageForHash($, this._task.site);
    this._hashIds[parsedProduct.id] = hash;

    return parsedProduct;
  }

  parseProductInfoPageForHash($, site) {
    // TODO: DSM London, find the .custom js file and make the request before this
    const regex = HashRegexes[site.name];
    if (!regex) {
      this._logger.debug(
        '%s: Parsing for hash is not required for this site, skipping...',
        this._name,
      );
      return null;
    }
    try {
      const hashes = [];
      $('#MainContent > script').each((i, e) => {
        // should match only one, but just in case, let's loop over all possibilities
        this._logger.silly('%s: parsing script element %d for hash...', this._name, i);
        if (e.children) {
          // check to see if we can find the hash property
          const elements = regex.exec(e.children[0].data);
          if (elements) {
            this._logger.debug('%s: Found match %s', this._name, elements[0]);
            hashes.push(elements[1]);
          } else {
            this._logger.debug('%s: No match found %s', this._name, e.children[0].data);
          }
        }
      });
      switch (hashes.length) {
        case 0: {
          this._logger.debug('%s: No Hash Found, returning null...', this._name);
          return null;
        }
        case 1: {
          const [hash] = hashes;
          this._logger.debug('%s: Found 1 Hash: %s, returning...', this._name, hash);
          return hash;
        }
        default: {
          const [hash] = hashes;
          this._logger.debug(
            '%s: Found %d Hashes! using the first one: %s',
            this._name,
            hashes.length,
            hash,
          );
          return hash;
        }
      }
    } catch (err) {
      this._logger.debug(
        'ERROR parsing %s hash property: %s %s',
        site.name,
        err.statusCode || err.status,
        err.message,
      );
      return null;
    }
  }

  async run() {
    const matchedProduct = await super.run();

    // Check for hash and store it before returning
    const hash = this._hashIds[matchedProduct.id];
    if (hash) {
      this._logger.debug(
        '%s, Found hash %s for matched product %s, storing on task...',
        this._name,
        hash,
        matchedProduct.title,
      );
      this._task.product.hash = hash;
    }

    return matchedProduct;
  }
}

module.exports = DsmParser;
