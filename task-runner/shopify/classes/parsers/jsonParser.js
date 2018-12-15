const utils = require('../utils/parse');
const _ = require('underscore');
const { formatProxy, userAgent, rfrl } = require('../utils');
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

class JsonParser {
  /**
   * Retrieve the full product info for a given product
   *
   * This method takes a given single product url and attempts to
   * get the full info for the product, filling in the gaps missed
   * by xml or atom parsing. This method sends out two requests,
   * one for the `.json` file and one for the `.oembed` file. The
   * first request to complete returns the full product info. If
   * both requests error out, a list of errors is returned.
   *
   * @param {String} productUrl
   */
  static getFullProductInfo(productUrl, logger) {
    const _logger = logger || { log: () => {} };
    _logger.log('silly', 'JsonParser: Getting Full Product Info...');
    _logger.log('silly', 'JsonParser: Requesting %s.(json|oembed) in a race', productUrl);
    const genRequestPromise = (uri) => {
      return rp({
        method: 'GET',
        uri,
        proxy: formatProxy(this._proxy) || undefined,
        rejectUnauthorized: false,
        json: false,
        simple: true,
        gzip: true,
        headers: {
          'User-Agent': userAgent,
        },
      });
    }

    return rfrl([
      genRequestPromise(`${productUrl}.json`).then(
        (res) => {
          // product.json contains the format we need -- just return it
          return JSON.parse(res).product;
        },
        (error) => {
          // Error occured, return a rejection with the status code attached
          return Promise.reject({
            status: error.statusCode || 404,
            message: error.message,
          });
        }),
      genRequestPromise(`${productUrl}.oembed`).then(
        (res) => {
          // product.oembed requires a little transformation before returning:
          const json = JSON.parse(res);

          return {
            title: json.title,
            vendor: json.provider,
            handle: json.product_id,
            variants: _.map(json.offers, offer => ({
              title: offer.title,
              id: offer.offer_id,
              price: `${offer.price}`
            })),
          };
        },
        (error) => {
          // Error occurred, return a rejection with the status code attached
          return Promise.reject({
            status: error.statusCode || 404,
            message: error.message,
          });
        },
      ),
    ], `productInfo - ${productUrl}`);
  }

  /**
   * Construct a new JsonParser
   *
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   */
  constructor(task, proxy, logger, name) {
    this._logger = logger || { log: () => {} };
    this._name = name || 'JsonParser';
    this._logger.log('silly', '%s: constructing...', this._name);
    this._proxy = proxy;
    this._task = task;
    this._type = utils.getParseType(task.product);
    this._logger.log('silly', '%s: constructed', this._name);
  }

  async run() {
    this._logger.log('silly', '%s: Starting run...', this._name);
    let products;
    try {
      this._logger.silly('%s: Making request for %s/products.json ...', this._name, this._task.site.url);
      const response = await rp({
        method: 'GET',
        uri: `${this._task.site.url}/products.json`,
        proxy: formatProxy(this._proxy) || undefined,
        rejectUnauthorized: false,
        json: false,
        simple: true,
        gzip: true,
        headers: {
            'User-Agent': userAgent,
        }
      });
      products = JSON.parse(response).products;
    } catch (error) {
      this._logger.silly('%s: ERROR making request!', this._name, error);
      const rethrow = new Error('unable to make request');
      rethrow.status = error.statusCode || 404; // Use the status code, or a 404 if no code is given
      throw rethrow;
    }
    this._logger.silly('%s: Received Response, Attempting to match...', this._name);
    const matchedProduct = this.match(products);

    if(!matchedProduct) {
      this._logger.silly('%s: Couldn\'t find a match!', this._name);
      throw new Error('unable to match the product');
    }
    this._logger.silly('%s: Product Found!', this._name);
    return matchedProduct;
  }

  /**
   * Perform Product Matching
   */
  match(products) {
    this._logger.silly('%s: starting parse...', this._name);
    switch(this._type) {
      case utils.ParseType.Variant: {
        this._logger.silly('%s: parsing type %s detected', this._name, this._type);
        const product = utils.matchVariant(products, this._task.product.variant, this._logger);
        if (!product) {
          this._logger.silly('%s: Unable to find matching product! throwing error', this._name);
          throw new Error('ProductNotFound');
        }
        this._logger.silly('%s: Product found!', this._name);
        return product;
      }
      case utils.ParseType.Keywords: {
        this._logger.silly('%s: parsing type %s detected', this._name, this._type);
        const keywords = {
          pos: this._task.product.pos_keywords,
          neg: this._task.product.neg_keywords,
        };
        const product = utils.matchKeywords(products, keywords, this._logger); // no need to use a custom filter at this point...
        if (!product) {
          this._logger.silly('%s: Unable to find matching product! throwing error', this._name);
          throw new Error('ProductNotFound');
        }
        this._logger.silly('%s: Matching Product found!', this._name);
        return product;
      }
      default: {
        this._logger.silly('%s: Invalid parsing type %s! throwing error', this._name, this._type);
        throw new Error('InvalidParseType');
      }
    }
  }
}

module.exports = JsonParser;
