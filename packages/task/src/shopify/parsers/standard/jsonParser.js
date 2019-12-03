import Parser from '../parser';
import { Constants, Utils } from '../../../common';

const { ErrorCodes } = Constants;
const { userAgent, getRandomIntInclusive } = Utils;

export default class JsonParser extends Parser {
  /**
   * Construct a new JsonParser
   *
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   */
  constructor(request, type, task, proxy, aborter, logger, random) {
    super(request, type, task, proxy, aborter, logger, random, 'JsonParser');
  }

  async run() {
    this._logger.silly('%s: Starting run...', this._name);
    const { url, name } = this._task.store;
    let products;
    let res;
    try {
      this._logger.silly(`%s: Making request for %s/products.json ...`, this._name, url);

      res = await this._request(
        `/products.json?page=-${getRandomIntInclusive(500000000000, 900000000000)}`,
        {
          method: 'GET',
          compress: true,
          headers: {
            'X-Shopify-Api-Features': getRandomIntInclusive(30000, 90000),
            'User-Agent': userAgent,
          },
          agent: this._proxy,
        },
      );

      if (/429|430/.test(res.status)) {
        const error = new Error('Proxy banned!');
        error.status = res.status;
        throw error;
      }

      if (/401/.test(res.status)) {
        const error = new Error('Password page');
        error.status = ErrorCodes.PasswordPage;
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

    // if we're monitoring on dsm us, also grab the hash from the page...
    let hash;
    if (/dsm us/i.test(name)) {
      const regex = /\$\(\s*atob\(\s*'PGlucHV0IHR5cGU9ImhpZGRlbiIgbmFtZT0icHJvcGVydGllc1tfSEFTSF0iIC8\+'\s*\)\s*\)\s*\.val\(\s*'(.+)'\s*\)/;
      try {
        res = await this._request(`${url}/products/${matchedProduct.handle}`, {
          method: 'GET',
          compress: true,
          headers: {
            'User-Agent': userAgent,
          },
          agent: this._proxy,
        });

        const body = await res.text();

        const match = body.match(regex);

        if (match && match.length) {
          [, hash] = match;
        }
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
    } else if (/dsm uk/i.test(name)) {
      hash = 'ee3e8f7a9322eaa382e04f8539a7474c11555';
    }

    this._aborter.abort();
    return {
      ...matchedProduct,
      hash,
      // insert generated product url (for restocking purposes)
      url: `${url}/products/${matchedProduct.handle}`,
    };
  }
}
