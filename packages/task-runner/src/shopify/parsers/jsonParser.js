const { userAgent, getRandomIntInclusive } = require('../../common');
const Parser = require('./parser');

class JsonParser extends Parser {
  /**
   * Construct a new JsonParser
   *
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   */
  constructor(request, type, task, proxy, aborter, logger) {
    super(request, type, task, proxy, aborter, logger, 'JsonParser');
  }

  async run() {
    this._logger.silly('%s: Starting run...', this._name);
    const { url } = this._task.site;
    let products;
    try {
      this._logger.silly(`%s: Making request for %s/products.json ...`, this._name, url);

      const res = await this._request(
        `/products.json?page=-${getRandomIntInclusive(500000000000, 900000000000)}`,
        {
          method: 'GET',
          headers: {
            'X-Shopify-Api-Features': getRandomIntInclusive(30000, 90000),
            'User-Agent': userAgent,
          },
          cancelToken: this._aborter.token,
          proxy: this._proxy,
        },
      );

      if (/429|430/.test(res.status)) {
        const error = new Error('Proxy banned!');
        error.status = res.status;
        throw error;
      }

      ({ products } = await res.json());
    } catch (error) {
      if (error && error.type && /system/i.test(error.type)) {
        const rethrow = new Error(error.errno);
        rethrow.status = error.code;
        throw rethrow;
      }
      this._logger.silly('%s: ERROR making request! %s %d', this._name, error.name, error.status);
      const rethrow = new Error('unable to make request');
      rethrow.status = error.status || 404; // Use the status code, or a 404 if no code is given
      rethrow.name = error.name;
      throw rethrow;
    }
    this._logger.silly(
      '%s: Received %d products, Attempting to match...',
      this._name,
      products ? products.length : 0,
    );
    const matchedProduct = await super.match(products);

    if (!matchedProduct) {
      this._logger.silly("%s: Couldn't find a match!", this._name);
      throw new Error('unable to match the product');
    }
    this._logger.silly('%s: Product Found!', this._name);
    this._aborter.cancel();
    return {
      ...matchedProduct,
      // insert generated product url (for restocking purposes)
      url: `${url}/products/${matchedProduct.handle}`,
    };
  }
}

module.exports = JsonParser;
