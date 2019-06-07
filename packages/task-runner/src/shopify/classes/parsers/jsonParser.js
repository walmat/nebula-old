const { formatProxy, userAgent } = require('../utils');
const { ParserType } = require('../utils/constants');
const Parser = require('./parser');

class JsonParser extends Parser {
  /**
   * Construct a new JsonParser
   *
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   */
  constructor(request, task, proxy, logger) {
    super(request, task, proxy, logger, 'JsonParser', ParserType.Json);
  }

  async fetch(url) {
    let products;
    try {
      this._logger.silly('%s: Making request for %s/products.json ...', this._name, url);
      const response = await this._request({
        method: 'GET',
        uri: `${url}/products.json`,
        proxy: formatProxy(this._proxy) || undefined,
        rejectUnauthorized: false,
        json: false,
        simple: true,
        gzip: true,
        headers: {
          'User-Agent': userAgent,
        },
      });
      ({ products } = JSON.parse(response));
    } catch (error) {
      this._logger.silly(
        '%s: ERROR making request! %s %d',
        this._name,
        error.name,
        error.statusCode,
      );
      const rethrow = new Error('unable to make request');
      rethrow.status = error.statusCode || 404; // Use the status code, or a 404 if no code is given
      throw rethrow;
    }

    return products.map(p => ({
      ...p,
      __type: this._type, // Include a tag for the type of parser used to generate this product
    }));
  }

  async run() {
    this._logger.silly('%s: Starting run...', this._name);
    const products = await this.fetch(this._task.site.url);
    this._logger.silly('%s: Received Response, Attempting to match...', this._name);
    const matchedProduct = super.match(products);

    if (!matchedProduct) {
      this._logger.silly("%s: Couldn't find a match!", this._name);
      throw new Error('unable to match the product');
    }
    this._logger.silly('%s: Product Found!', this._name);
    return {
      ...matchedProduct,
      // insert generated product url (for restocking purposes)
      url: `${url}/products/${matchedProduct.handle}`,
    };
  }
}

module.exports = JsonParser;
