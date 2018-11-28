const SpecialParser = require('./specialParser');
const { ParseType, matchKeywords } = require('../utils/parse');

/**
 * Special Parser for all DSM sites
 */
class DsmParser extends SpecialParser {
  constructor(task, proxy, logger) {
    super(task, proxy, logger, 'DsmParser');
  }

  parseInitialPage($) {
    // Look for all `.grid-view-item`'s
    const parsedItems = $('.grid-view-item').map((i, el) => {
      const link = $('.grid-view-item__link', this).attr('href');
      const title = $('.grid-view-item__title', this).text();

      if (!link || !title) {
        return null;
      }
      return { link, title };
    }).filter(i => !!(i));

    if(!items.length) {
      throw new Error('No Items Found');
    }

    let items = parsedItems;
    // If parsing keywords, reduce the number of pages to search by matching the title
    if (this._type === ParseType.Keywords) {
      const keywords = {
        pos: this._task.product.pos_keywords,
        neg: this._task.product.neg_keywords,
      }
      items = matchKeywords(parsedItems, keywords);
    }
    this._logger.silly('%s: parsing inital page, found %d items', this._name, items.length);

    // Convert items to full urls
    const productUrls = items.map(({ link }) => {
      return new URL(link, this._task.site.url).href;
    });

    return productUrls;
  }

  parseProductInfoPage($) {
    // Look for the script tag containing the product json
    const product = $('script#ProductJson-product-template');
    if(!product || product.attr('type') !== 'application/json') {
      throw new Error('Could not find product data!');
    }
    return JSON.parse(product.text());
  }
}

module.exports = DsmParser;
