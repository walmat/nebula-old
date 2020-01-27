import { Utils, Constants } from '../../common';
import { Parse } from '../utils';

const { ErrorCodes, Monitor } = Constants;
const { match } = Parse;
const { userAgent, getRandomIntInclusive } = Utils;
const { ParseType } = Monitor;
export default class JsonParser {
  get context() {
    return this._context;
  }

  constructor(context, aborter, fetch) {
    this._context = context;
    this._aborter = aborter;
    this._fetch = fetch;
  }

  async run() {
    const { logger, task, proxy, parseType } = this.context;
    logger.silly('Starting JSON parser!');
    if (parseType !== ParseType.Keywords) {
      throw new Error(`Improper parse type: ${parseType} (Collection Parser)`);
    }
    let products;
    let res;
    try {
      logger.silly('Making request for products.json');
      res = await this._fetch(
        `/products.json?limit=-${getRandomIntInclusive(10000, 500000)}&type=${Date.now()}`,
        {
        method: 'GET',
        compress: true,
        headers: {
          'X-Shopify-Api-Features': Math.random() * Number.MAX_SAFE_INTEGER,
          'user-agent': userAgent,
        },
        agent: proxy ? proxy.proxy : null,
      });

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
      logger.silly('ERROR making request! %s %s', error.name, error.status);
      const rethrow = new Error('unable to make request');
      rethrow.status = error.status || 404; // Use the status code, or a 404 if no code is given
      rethrow.name = error.name;
      throw rethrow;
    }
    logger.silly('Received %d products', products ? products.length : 0);
    const matchedProduct = await match(this.context, products);

    if (!matchedProduct) {
      logger.silly("Couldn't find a match!");
      const error = new Error('ProductNotMatched');
      error.status = ErrorCodes.NoMatchesFound;
      throw error;
    }
    logger.silly('Product Found: %j', matchedProduct.title);

    // if we're monitoring on dsm us, also grab the hash from the page...
    let hash;
    if (/dsm us/i.test(task.store.name)) {
      const regex = /\$\(\s*atob\(\s*'PGlucHV0IHR5cGU9ImhpZGRlbiIgbmFtZT0icHJvcGVydGllc1tfSEFTSF0iIC8\+'\s*\)\s*\)\s*\.val\(\s*'(.+)'\s*\)/;
      try {
        res = await this._fetch(`/products/${matchedProduct.handle}`, {
          method: 'GET',
          compress: true,
          headers: {
            'User-Agent': userAgent,
          },
          agent: proxy ? proxy.proxy : null,
        });

        const body = await res.text();

        const found = body.match(regex);

        if (found && found.length) {
          [, hash] = found;
        }
      } catch (error) {
        if (error && error.type && /system/i.test(error.type)) {
          const rethrow = new Error(error.errno);
          rethrow.status = error.code;
          throw rethrow;
        }
        logger.silly('%s: ERROR making request! %s %s', error.name, error.status);
        const rethrow = new Error('unable to make request');
        rethrow.status = error.status || 404; // Use the status code, or a 404 if no code is given
        rethrow.name = error.name;
        throw rethrow;
      }
    } else if (/dsm uk/i.test(task.store.name)) {
      hash = 'ee3e8f7a9322eaa382e04f8539a7474c11555';
    }

    this._aborter.abort();
    return {
      ...matchedProduct,
      hash,
      // insert generated product url (for restocking purposes)
      url: `${task.store.url}/products/${matchedProduct.handle}`,
    };
  }
}
