import SpecialParser from '../specialParser';
import { Parse } from '../../utils';
import { Constants } from '../../../common';
import { Monitor } from '../../constants';

const { ErrorCodes } = Constants;
const { matchKeywords } = Parse;
const { ParseType } = Monitor;

/**
 * Base Special Parser for all DSM stores
 */
export default class DsmParser extends SpecialParser {
  constructor(request, type, task, proxy, aborter, logger, name = 'DsmParser') {
    super(request, type, task, proxy, aborter, logger, name);

    /**
     * Some Dsm stores requires specific hashes to be attached when adding
     * to cart. We store all parsed hashes in a map (keyed by product id)
     * so they can be used. By default, this map is not used, but
     * subclasses can extend this class and add support in the following ways:
     *
     * 1. implementing parseInitialPageForHash($) - this method receives the
     *    initial page loaded with cheerio and expects a hash to be returned.
     *    The hash is set as the default hash for all products unless they are
     *    set specifically for a product
     * 2. implementing parseProductPageForHash($) - this method receives the
     *    product page loaded with cheerio and expects a hash to be returned.
     *    The hash is set for that product's id. If the matched product has an
     *    id stored for it through this method, it is used, then the default hash
     *    is used and finally the backup hash is used.
     */
    this._hashIds = {};
  }

  // eslint-disable-next-line class-methods-use-this
  get initialPageContainsProducts() {
    return false;
  }

  async parseInitialPageForUrls($) {
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
        pos: this._task.product.pos,
        neg: this._task.product.neg,
      };
      items = matchKeywords(parsedItems, keywords, null, null, true) || [];
    }
    this._logger.silly('%s: parsing initial page, found %d items', this._name, items.length);

    if (!items.length) {
      // If no products are found, throw an error, but specify a special status to stop the task
      // TODO: Maybe replace with a custom error object?
      const error = new Error('No Items Found');
      error.status = ErrorCodes.ProductNotFound;
      throw error;
    }

    // Convert items to full urls
    const productUrls = items.map(({ link }) => new URL(link, this._task.store.url).href);

    // Parse for hash
    const hash = await this.parseInitialPageForHash($);
    if (hash) {
      this._hashIds.__default__ = hash;
      this._logger.silly('%s: Set default hash property to %s', this._name, hash);
    }

    return productUrls;
  }

  parseInitialPageForHash() {
    this._logger.silly(
      "%s: this parser doesn't support parsing initial page for hash, skipping...",
      this._name,
    );
    return null;
  }

  async parseProductInfoPageForProduct($) {
    this._logger.silly('%s: Parsing product info page for product data...', this._name);
    // Look for the script tag containing the product json
    const product = $('script#ProductJson-product-template');
    if (!product || product.attr('type') !== 'application/json') {
      this._logger.silly('%s: No Items found in product script!', this._name);
      // If no products are found, throw an error, but specify a special status to stop the task
      // TODO: Maybe replace with a custom error object?
      const error = new Error('No Items Found');
      error.status = ErrorCodes.ProductNotFound;
      throw error;
    }

    this._logger.silly('%s: Product script found, returning parsed output', this._name);

    const parsedProduct = JSON.parse(product.html());
    // Calcalate and store hash for this product
    const hash = await this.parseProductInfoPageForHash($, this._task.store);
    if (hash) {
      this._hashIds[parsedProduct.id] = hash;
      this._logger.silly(
        '%s: Set hash property to %s for id %s',
        this._name,
        hash,
        parsedProduct.id,
      );
    }

    return parsedProduct;
  }

  parseProductInfoPageForHash() {
    this._logger.silly(
      "%s: this parser doesn't support parsing product info pages for hash, skiping...",
      this._name,
    );
    return null;
  }

  async run() {
    const matchedProduct = await super.run();

    // Check for hash and store it before returning
    const hash = this._hashIds[matchedProduct.id] || this._hashIds.__default__;
    if (hash) {
      this._logger.silly(
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
