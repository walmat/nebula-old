const utils = require('../utils/parse');
const { rfrl } = require('../utils/rfrl');
const _ = require('underscore');
const {
  formatProxy,
  userAgent,
} = require('../utils');
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
  static getFullProductInfo(productUrl) {
    console.log('[TRACE]: JsonParser: Getting Full Product Info...');
    console.log(`[TRACE]: JsonParser: Requesting ${productUrl}.(json|oembed) in a race`);
    const genRequestPromise = (uri) => {
      return rp({
        method: 'GET',
        uri,
        proxy: formatProxy(this._proxy) || undefined,
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
  constructor(task, proxy) {
    console.log('[TRACE]: JsonParser: constructing...');
    this._proxy = proxy;
    this._task = task;
    this._type = utils.getParseType(task.product);
    console.log('[TRACE]: JsonParser: constructed');
  }

  async run() {
    console.log('[TRACE]: JsonParser: Starting run...');
    let products;
    try {
      console.log(`[TRACE]: JsonParser: Making request for ${this._task.site.url}/products.json ...`);
      const response = await rp({
        method: 'GET',
        uri: `${this._task.site.url}/products.json`,
        proxy: formatProxy(this._proxy) || undefined,
        json: false,
        simple: true,
        gzip: true,
        headers: {
            'User-Agent': userAgent,
        }
      });
      products = JSON.parse(response).products;
    } catch (error) {
      console.log(`[TRACE]: JsonParser: ERROR making request! Error:\n${error}`);
      const rethrow = new Error('unable to make request');
      rethrow.status = error.statusCode || 404; // Use the status code, or a 404 if no code is given
      throw rethrow;
    }

    console.log('[TRACE]: JsonParser: Received Response, Attempting to match...');
    const matchedProduct = this.match(products);

    if(!matchedProduct) {
      console.log('[TRACE]: JsonParser: Could\'t find a match!');
      throw new Error('unable to match the product');
    }

    console.log('[TRACE]: JsonParser: Product Found!');
    return matchedProduct;
  }

  /**
   * Perform Product Matching
   */
  match(products) {
    console.log('[TRACE]: JsonParser: starting parse...')
    switch(this._type) {
      case utils.ParseType.Variant: {
        console.log(`[TRACE]: JsonParser: parsing type ${this._type} detected`);
        const product = utils.matchVariant(products, this._task.product.variant);
        if (!product) {
          console.log('[TRACE]: Unable to find matching product! throwing error');
          throw new Error('ProductNotFound');
        }
        console.log('[TRACE]: Matching Product found!');
        return product;
      }
      case utils.ParseType.Keywords: {
        console.log(`[TRACE]: JsonParser: parsing type ${this._type} detected`);
        const keywords = {
          pos: this._task.product.pos_keywords,
          neg: this._task.product.neg_keywords,
        };
        const product = utils.matchKeywords(products, keywords); // no need to use a custom filter at this point...
        if (!product) {
          console.log('[TRACE]: Unable to find matching product! throwing error');
          throw new Error('ProductNotFound');
        }
        console.log('[TRACE]: Matching Product found!');
        return product;
      }
      default: {
        console.log(`[TRACE]: JsonParser: Invalid parsing type ${this._type}! throwing error`);
        throw new Error('InvalidParseType');
      }
    }
  }
}

module.exports = JsonParser;