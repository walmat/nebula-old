/* eslint-disable class-methods-use-this */
import { rfrl, userAgent } from '../../common';
import { matchVariant, matchKeywords } from '../utils/parse';
import { ErrorCodes, Monitor } from '../utils/constants';

const { ParseType } = Monitor;

export default class Parser {
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
        redirect: 'follow',
        follow: 1,
        compress: true,
        agent: proxy,
        headers: {
          'User-Agent': userAgent,
        },
      });

    return rfrl(
      [
        genRequestPromise(`${productUrl}.js`).then(
          // {productUrl}.js contains the format we need -- just return it
          async res => {
            if (!res.ok) {
              const err = new Error(res.message);
              err.status = res.status || 404;
              err.name = res.name;
              throw err;
            }
            return res.json();
          },
          async error => {
            if (error && error.type && /system/i.test(error.type)) {
              const rethrow = new Error(error.errno);
              rethrow.status = error.code;
              throw rethrow;
            }
            // Error occured, return a rejection with the status code attached
            const err = new Error(error.message);
            err.status = error.status || 404;
            err.name = error.name;
            throw err;
          },
        ),
        genRequestPromise(`${productUrl}.oembed`).then(
          async res => {
            if (!res.ok) {
              // Error occured, return a rejection with the status code attached
              const err = new Error(res.message);
              err.status = res.status || 404;
              err.name = res.name;
              throw err;
            }
            // {productUrl}.oembed requires a little transformation before returning:
            const json = await res.json();

            return {
              title: json.title,
              vendor: json.provider,
              handle: json.product_id,
              featured_image: json.thumbnail_url,
              variants: json.offers.map(offer => ({
                title: offer.title,
                id: offer.offer_id,
                price: `${offer.price}`,
                available: offer.in_stock || false,
              })),
            };
          },
          async error => {
            if (error && error.type && /system/i.test(error.type)) {
              const rethrow = new Error(error.errno);
              rethrow.status = error.code;
              throw rethrow;
            }
            // Error occured, return a rejection with the status code attached
            const err = new Error(error.message);
            err.status = error.status || 404;
            err.name = error.name;
            throw err;
          },
        ),
      ],
      `productInfo - ${productUrl}`,
      this._logger,
    );
  }

  /**
   * Construct a new parser
   */
  constructor(request, type, task, proxy, aborter, logger, random, name) {
    this._logger = logger || { log: () => {} };
    this._name = name || 'Parser';
    this._logger.log('silly', '%s: constructing...', this._name);
    this._proxy = proxy;
    this._request = request;
    this._task = task;
    this._type = type;
    this._aborter = aborter;
    this._logger.log('silly', '%s: constructed', this._name);
    this._random = random;
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
  async match(products) {
    this._logger.silly('%s: Starting match for parse type: %j', this._name, this._type);
    switch (this._type) {
      case ParseType.Variant: {
        this._logger.silly('%s: parsing type %s detected', this._name, this._type);
        const product = matchVariant(products, this._task.product.variant, null, this._logger);
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

        const product = matchKeywords(products, keywords, null, this._logger, false, this._random); // no need to use a custom filter at this point...
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
