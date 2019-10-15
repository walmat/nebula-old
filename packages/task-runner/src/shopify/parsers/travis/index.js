import SpecialParser from '../specialParser';
import { matchKeywords } from '../../utils/parse';
import { ErrorCodes, Monitor } from '../../utils/constants';

const { ParseType } = Monitor;

export default class TravisParser extends SpecialParser {
  constructor(request, type, task, proxy, aborter, logger, name = 'TravisParser') {
    super(request, type, task, proxy, aborter, logger, name);
  }

  // eslint-disable-next-line class-methods-use-this
  get initialPageContainsProducts() {
    return false;
  }

  async parseInitialPageForUrls($) {
    const parsedItems = [];

    const messages = {
      [ErrorCodes.ProductNotFound]: 'No items found!',
      [ErrorCodes.ProductNotLive]: 'Placeholder live!',
    };

    const validateArray = (arr = [], errorCode = ErrorCodes.ProductNotFound) => {
      if (arr.length === 0) {
        // If no products are found, throw an error, but specify a special status to stop the task
        // TODO: Maybe replace with a custom error object?
        const error = new Error(messages[errorCode] || 'No Items Found');
        error.status = errorCode;
        throw error;
      }
    };

    const parseTag = el => {
      if (el.attr('type') !== 'application/json') {
        return;
      }

      try {
        const html = el.html();
        const product = JSON.parse(html);

        if (product) {
          const { title, handle } = product;

          if (!title || !handle) {
            return;
          }

          parsedItems.push({ title, link: `${this._task.site.url}/products/${handle}` });
        }
      } catch (err) {
        this._logger.silly(
          '%s: found script tag but was unable to parse json! skipping...',
          this._name,
        );
      }
    };

    this._logger.silly('%s: Capturing products...', this._name);
    const scriptTags = $('script.js-product-json');
    validateArray(scriptTags);
    if (scriptTags.length === 1) {
      // scriptTags is the only element, parse it
      parseTag(scriptTags);
    } else {
      // scriptTags has multiple elements, parse each one
      scriptTags.each((_, el) => {
        parseTag($(el));
      });
    }

    let items = parsedItems;

    if (this._type === ParseType.Keywords && items.length) {
      const keywords = {
        pos: this._task.product.pos_keywords,
        neg: this._task.product.neg_keywords,
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
    const productUrls = items.map(({ link }) => new URL(link, this._task.site.url).href);
    return productUrls;
  }

  async parseProductInfoPageForProduct($) {
    this._logger.silly('%s: Parsing product info page for product data...', this._name);
    const match = $.match(/.*var\s*meta\s*=\s*(.*);/);

    if (!match || match.length <= 1) {
      this._logger.silly('%s: No Items found in product script!', this._name);
      const error = new Error('No Items Found');
      error.status = ErrorCodes.ProductNotFound;
      throw error;
    }

    const [, fullProductInfo] = match;

    let parsedProduct;
    try {
      ({ product: parsedProduct } = JSON.parse(fullProductInfo));
    } catch (err) {
      throw err;
    }

    // transform the object a bit before returning it...
    const transformedProduct = {
      id: parsedProduct.id,
      title: parsedProduct.variants[0].name,
      handle: '-',
      variants: parsedProduct.variants.map(v => ({
        id: v.id,
        price: v.price,
        option1: v.public_title,
        available: true, // assume all are available..
      })),
    };

    return transformedProduct;
  }
}
