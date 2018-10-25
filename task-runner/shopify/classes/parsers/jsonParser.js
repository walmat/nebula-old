const utils = require('../utils/parse');
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
   * Construct a new JsonParser
   * 
   * @param {List} products list of products to search
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
      throw new Error('unable to make request');
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