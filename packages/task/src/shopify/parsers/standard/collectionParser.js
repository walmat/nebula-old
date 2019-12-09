import { Utils, Constants } from '../../../common';
import { Monitor } from '../../constants';
import { Parse } from '../../utils';

const { ErrorCodes } = Constants;
const { match } = Parse;
const { userAgent } = Utils;
const { ParseType } = Monitor;

export default class CollectionParser {
  constructor(context, aborter, fetch) {
    this.context = context;
    this._aborter = aborter;
    this._fetch = fetch;
  }

  async run() {
    const { logger, task, proxy, parseType } = this.context;
    logger.silly('Starting /all/products.json parser!');
    if (parseType !== ParseType.Keywords) {
      throw new Error(`Improper parse type: ${parseType} (Collection Parser)`);
    }

    let products;
    let res;
    try {
      logger.silly('Making request for %s/collections/all/products.json ...', task.store.url);
      res = await this._request('/collections/all/products.json', {
        method: 'GET',
        compress: true,
        headers: {
          'user-agent': userAgent,
        },
        agent: proxy ? proxy.proxy : null,
      });

      if (/429|430|ECONNREFUSED|ECONNRESET|ENOTFOUND/.test(res.status)) {
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

      logger.silly('ERROR making request! %s %s', error.name, error.status);
      const rethrow = new Error('Unable to make request');
      rethrow.status = error.status || 404; // Use the status code, or a 404 if no code is given
      rethrow.name = error.name;
      throw rethrow;
    }

    logger.silly('Received %d products', products ? products.length : 0);
    const matchedProduct = await match(products);

    if (!matchedProduct) {
      logger.silly("Couldn't find a match!");
      const error = new Error('ProductNotMatched');
      error.status = ErrorCodes.NoMatchesFound;
      throw error;
    }
    logger.silly('Product Found: %j', matchedProduct.title);

    this._aborter.abort();
    return {
      ...matchedProduct,
      // insert generated product url (for restocking purposes)
      url: `${task.store.url}/products/${matchedProduct.handle}`,
    };
  }
}
