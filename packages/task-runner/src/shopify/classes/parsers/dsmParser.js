/* eslint-disable class-methods-use-this */
const SpecialParser = require('./specialParser');
const { ParseType, matchKeywords } = require('../utils/parse');
const ErrorCodes = require('../utils/constants').ErrorCodes.Parser;

/**
 * Special Parser for all DSM sites
 */
class DsmParser extends SpecialParser {
  constructor(task, proxy, logger) {
    super(task, proxy, logger, 'DsmParser');
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
}

module.exports = DsmParser;
