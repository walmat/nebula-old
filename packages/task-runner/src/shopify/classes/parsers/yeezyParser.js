import SpecialParser from './specialParser';

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
    $('script.js-product-json').each((idx, el) => {
      if (el.attr('type') !== 'application/json') {
        return;
      }

      const html = el.html();
      try {
        const product = JSON.parse(html);
        products.push(product);
      } catch (err) {
        this._logger.silly(
          '%s: found script tag but was unable to parse json! skipping...',
          this._name,
        );
      }
    });

    this._logger.silly(
      '%s: Found %d potential products, validating...',
      this._name,
      products.length,
    );

    const validatedProducts = products.filter(
      ({ id, title, handle, variants }) => id && variants && (title || handle),
    );

    this._logger.silly('%s: Found %d products!', this._name, validatedProducts.length);

    return validatedProducts;
  }
}

module.exports = YeezyParser;
