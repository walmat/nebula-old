/* eslint-disable class-methods-use-this */
import HttpsProxyAgent from 'https-proxy-agent';

const { ParseType, getParseType, matchVariant, matchKeywords } = require('../utils/parse');
const { userAgent, rfrl } = require('../utils');
const { ErrorCodes } = require('../utils/constants');

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
      request(uri, {
        method: 'GET',
        agent: proxy ? new HttpsProxyAgent(proxy.proxy) : null,
        headers: {
          'User-Agent': userAgent,
        },
      });

    return rfrl(
      [
        genRequestPromise(`${productUrl}.js`).then(
          // {productUrl}.js contains the format we need -- just return it
          async res => {
            this._aborter.abort();
            return res.json();
          },
          error => {
            // Error occured, return a rejection with the status code attached
            const err = new Error(error.message);
            err.status = error.statusCode || 404;
            throw err;
          },
        ),
        genRequestPromise(`${productUrl}.oembed`).then(
          async res => {
            // {productUrl}.oembed requires a little transformation before returning:
            const json = await res.json();

            const data = {
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
            this._aborter.abort();
            return data;
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
  constructor(request, task, proxy, aborter, logger, name) {
    this._logger = logger || { log: () => {} };
    this._name = name || 'Parser';
    this._logger.log('silly', '%s: constructing...', this._name);
    this._proxy = proxy;
    this._request = request;
    this._task = task;
    this._type = getParseType(task.product);
    this._aborter = aborter;
    this._logger.log('silly', '%s: constructed', this._name);
  }

  /**
   * Getter to determine if the parser is special or not
   */
  get isSpecial() {
    return false;
  }

  async run() {
    throw new Error('Not Implemented! This should be implemented by subclasses!');
  }

  /**
   * Perform Product Matching based on the parse type
   */
  match(products) {
    this._logger.silly('%s: starting parse...', this._name);
    switch (this._type) {
      case ParseType.Variant: {
        this._logger.silly('%s: parsing type %s detected', this._name, this._type);
        const product = matchVariant(products, this._task.product.variant, this._logger);
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
      case ParseType.Keywords: {
        this._logger.silly('%s: parsing type %s detected', this._name, this._type);
        const keywords = {
          pos: this._task.product.pos_keywords,
          neg: this._task.product.neg_keywords,
        };
        const product = matchKeywords(products, keywords, this._logger); // no need to use a custom filter at this point...
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
      default: {
        this._logger.silly('%s: Invalid parsing type %s! throwing error', this._name, this._type);
        // TODO: Create an ErrorCode for this
        throw new Error('InvalidParseType');
      }
    }
  }
}

module.exports = Parser;
