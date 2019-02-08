/* eslint-disable class-methods-use-this */
const SpecialParser = require('./specialParser');
const { ParseType, matchKeywords } = require('../utils/parse');
const ErrorCodes = require('../utils/constants').ErrorCodes.Parser;

/**
 * NY: <input type="hidden" name="properties[_HASH]" />
 * L: <input type="hidden" name="properties[_hash]" />
 */
const HashRegexes = {
  'DSM NY': /\$\(\s*atob\(\s*'PGlucHV0IHR5cGU9ImhpZGRlbiIgbmFtZT0icHJvcGVydGllc1tfSEFTSF0iIC8\+'\s*\)\s*\)\s*\.val\(\s*'(.+)'\s*\)/,
  'DSM UK': /\$\(\s*atob\(\s*'PGlucHV0IHR5cGU9ImhpZGRlbiIgbmFtZT0icHJvcGVydGllc1tfaGFzaF0iIC8\+'\s*\)\s*\)\s*\.val\(\s*'(.+)'\s*\)/,
};

/**
 * Special Parser for all DSM sites
 */
class DsmParser extends SpecialParser {
  constructor(request, task, proxy, logger) {
    super(request, task, proxy, logger, 'DsmParser');
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
    return JSON.parse(product.html());
  }

  parseProductInfoPageForHash($, regex) {
    $('#MainContent > script').each((i, e) => {
      // should match only one, but just in case, let's loop over all possibilities
      this._logger.silly('%s: parsing %d script element for hash: %j', this._name, i, e);
      if (e && e.attr('type') !== 'application/json') {
        // check to see if we can find the hash property
        this._logger.silly('%s: innerHTML', this._name, e.innerHTML);
        const elements = regex.exec(e.innerHTML);
        if (elements) {
          return elements[1];
        }
      }
      return null;
    });
  }

  async findHashProperty($, site) {
    // TODO: DSM London, find the .custom js file and make the request before this
    try {
      const hash = await this.parseProductInfoPageForHash($, HashRegexes[site.name]);
      return hash;
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
}

module.exports = DsmParser;
