import HttpsProxyAgent from 'https-proxy-agent';

const { userAgent } = require('../utils');
const Parser = require('./parser');

class JsonParser extends Parser {
  /**
   * Construct a new JsonParser
   *
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   */
  constructor(request, task, proxy, logger) {
    super(request, task, proxy, logger, 'JsonParser');
  }

  async run() {
    this._logger.silly('%s: Starting run...', this._name);
    const { url } = this._task.site;
    let products;
    try {
      this._logger.silly('%s: Making request for %s/products.json ...', this._name, url);

      const res = await this._request('/products.json', {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
        },
        agent: this._proxy ? new HttpsProxyAgent(this.proxy.proxy) : null,
      });

      ({ products } = await res.json());
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
