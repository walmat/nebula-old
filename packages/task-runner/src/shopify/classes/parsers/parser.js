/* eslint-disable class-methods-use-this */
const { getProductInputType, matchVariants, matchKeywords } = require('../utils/parse');
const { formatProxy, userAgent, rfrl } = require('../utils');
const { ErrorCodes, ProductInputType } = require('../utils/constants');

class Parser {
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
   * @param {String} productUrl
   */
  static getFullProductInfo(productUrl, proxy, request, logger) {
    const _logger = logger || { log: () => {} };
    _logger.log('silly', 'Parser: Getting Full Product Info...');
    _logger.log('silly', 'Parser: Requesting %s.(js|oembed) in a race', productUrl);
    const genRequestPromise = uri =>
      request({
        method: 'GET',
        uri,
        proxy: formatProxy(proxy),
        rejectUnauthorized: false,
        json: false,
        simple: true,
        gzip: true,
        headers: {
          'User-Agent': userAgent,
        },
      });

    return rfrl(
      [
        genRequestPromise(`${productUrl}.js`).then(
          res =>
            // {productUrl}.js contains the format we need -- just return it
            JSON.parse(res),
          error => {
            // Error occured, return a rejection with the status code attached
            const err = new Error(error.message);
            err.status = error.statusCode || 404;
            throw err;
          },
        ),
        genRequestPromise(`${productUrl}.oembed`).then(
          res => {
            // {productUrl}.oembed requires a little transformation before returning:
            const json = JSON.parse(res);

            return {
              title: json.title,
              vendor: json.provider,
              handle: json.product_id,
              variants: json.offers.map(offer => ({
                title: offer.title,
                id: offer.offer_id,
                price: `${offer.price}`,
                available: offer.in_stock || false,
              })),
            };
          },
          error => {
            // Error occured, return a rejection with the status code attached
            const err = new Error(error.message);
            err.status = error.statusCode || 404;
            throw err;
          },
        ),
      ],
      `productInfo - ${productUrl}`,
    );
  }

  /**
   * Construct a new parser
   */
  constructor(request, task, proxy, logger, name) {
    this._logger = logger || { log: () => {} };
    this._name = name || 'Parser';
    this._logger.log('silly', '%s: constructing...', this._name);
    this._proxy = proxy;
    this._request = request;
    // TODO: remove this when all uses have been replaced
    this._task = task; // deprecated
    this._productInputType = getProductInputType(task.product); // deprecated

    this._products = [];
    this._logger.log('silly', '%s: constructed', this._name);
  }

  /**
   * Getter to determine if the parser is special or not
   */
  get isSpecial() {
    return false;
  }

  async fetch() {
    throw new Error('Not Implemented! This should be implemented by subclasses!');
  }

  async run() {
    throw new Error('Not Implemented! This should be implemented by subclasses!');
  }

  /**
   * Perform Product Matching for all tracked product inputs
   */
  matchAll(products) {
    this._logger.silly('%s: starting parse...', this._name);
    // Return map to matched products
    return this._products.map(productInput => {
      const type = getProductInputType(productInput);
      try {
        const product = this.match(products, productInput, type);
        return product;
      } catch (err) {
        return err;
      }
    });
  }

  /**
   * Perform Product Matching based on the parse type
   */
  match(products, matchInput, type) {
    // Fall back to old data if inputs are not given
    const _matchInput = matchInput || this._task.product;
    const _type = type || this._productInputType;
    this._logger.silly('%s: starting parse...', this._name);
    switch (_type) {
      case ProductInputType.Variant: {
        this._logger.silly('%s: parsing type %s detected', this._name, _type);
        const [product] = matchVariants(products, [_matchInput.variant], this._logger);
        if (!product) {
          this._logger.silly('%s: Unable to find matching product! throwing error', this._name);
          // TODO: Maybe replace with a custom error object?
          const error = new Error('ProductNotFound');
          error.status = ErrorCodes.ProductNotFound;
          throw error;
        }
        this._logger.silly('%s: Product found!', this._name);
        return product;
      }
      case ProductInputType.Keywords: {
        this._logger.silly('%s: parsing type %s detected', this._name, _type);
        const keywords = {
          pos: _matchInput.pos_keywords,
          neg: _matchInput.neg_keywords,
        };
        const [product] = matchKeywords(products, [keywords], this._logger); // no need to use a custom filter at this point...
        if (!product) {
          this._logger.silly('%s: Unable to find matching product! throwing error', this._name);
          // TODO: Maybe replace with a custom error object?
          const error = new Error('ProductNotFound');
          error.status = ErrorCodes.ProductNotFound;
          throw error;
        }
        this._logger.silly('%s: Matching Product found!', this._name);
        return product;
      }
      // TODO: Add this case in (if necessary)
      // case ProductInputType.Url: {
      //   break;
      // }
      default: {
        this._logger.silly('%s: Invalid parsing type %s! throwing error', this._name, _type);
        // TODO: Create an ErrorCode for this
        throw new Error('InvalidParseType');
      }
    }
  }
}

module.exports = Parser;
