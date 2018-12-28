const SpecialParser = require('./specialParser');
const ErrorCodes = require('../utils/constants').ErrorCodes.Parser;

class YeezyParser extends SpecialParser {
  constructor(task, proxy, logger) {
    super(task, proxy, logger, 'YeezyParser');
  }

  // eslint-disable-next-line class-methods-use-this
  get initialPageContainsProducts() {
    return true;
  }

  parseInitialPageForProducts($) {
    // Look for all `.js-product-json`'s
    const products = [];

    const validateArray = arr => {
      this._logger.verbose('YEEZYPARSER: Array to validate: %j', arr);
      if (arr.length === 0) {
        // If no products are found, throw an error, but specify a special status to stop the task
        // TODO: Maybe replace with a custom error object?
        const error = new Error('No Items Found');
        error.status = ErrorCodes.ProductNotFound;
        throw error;
      }
    };

    const parseTag = el => {
      this._logger.verbose('YEEZYPARSER: Traversing element: %j', el);
      if (el.attr('type') !== 'application/json') {
        return;
      }

      try {
        const html = el.html();
        this._logger.verbose('YEEZYPARSER: HTML element: %j', html);
        const product = JSON.parse(html);
        this._logger.verbose('YEEZYPARSER: PRODUCT element: %j', product);
        products.push(product);
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
    this._logger.verbose('YEEZYPARSER: SCRIPTTAGS element: %j', scriptTags);
    if (scriptTags.length === 1) {
      // scriptTags is the only element, parse it
      parseTag(scriptTags);
    } else {
      // scriptTags has multiple elements, parse each one
      scriptTags.each((_, el) => {
        this._logger.verbose('YEEZYPARSER: SCRIPTTAG looped element: %j', el);
        parseTag($(el));
      });
    }

    validateArray(products);
    this._logger.silly(
      '%s: Found %d potential products, validating...',
      this._name,
      products.length,
    );

    const validatedProducts = products.filter(
      ({ id, title, handle, variants }) => id && variants && (title || handle),
    );

    validateArray(validatedProducts);
    this._logger.silly('%s: Found %d products!', this._name, validatedProducts.length);

    return validatedProducts;
  }

  parseProductInfoPageForProduct($) {
    // Proxy the initial page parsing since it works for product pages as well...
    const [matchedProduct] = this.parseInitialPageForProducts($);
    return matchedProduct;
  }
}

module.exports = YeezyParser;
