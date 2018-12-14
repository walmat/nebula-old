const { formatProxy, userAgent } = require('../utils');
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});
const Parser = require('./parser');

class JsonParser extends Parser {
  /**
   * Construct a new JsonParser
   * 
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   */
  constructor(task, proxy, logger) {
    super(task, proxy, logger, 'JsonParser');
  }

  async run() {
    this._logger.silly('%s: Starting run...', this._name);
    let products;
    try {
      this._logger.silly('%s: Making request for %s/products.json ...', this._name, this._task.site.url);
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
      this._logger.silly('%s: ERROR making request!', this._name, error);
      const rethrow = new Error('unable to make request');
      rethrow.status = error.statusCode || 404; // Use the status code, or a 404 if no code is given
      throw rethrow;
    }
    this._logger.silly('%s: Received Response, Attempting to match...', this._name);
    const matchedProduct = super.match(products);

    if(!matchedProduct) {
      this._logger.silly('%s: Couldn\'t find a match!', this._name);
      throw new Error('unable to match the product');
    }
    this._logger.silly('%s: Product Found!', this._name);
    return matchedProduct;
  }
}

module.exports = JsonParser;
