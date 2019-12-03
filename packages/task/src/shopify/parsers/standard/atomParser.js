import Parser from '../parser';
import { Utils } from '../../../common';
import { Monitor } from '../../constants';

const { userAgent } = Utils;
const { ParseType } = Monitor;

export default class AtomParser extends Parser {
  /**
   * Construct a new AtomParser
   *
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   * @param {Logger} (optional) A logger to log messages to
   */
  constructor(request, type, task, proxy, aborter, logger, random) {
    super(request, type, task, proxy, aborter, logger, random, 'AtomParser');
  }

  async run() {
    this._logger.silly('%s: starting run...', this._name);
    const { url } = this._task.store;
    if (this._type !== ParseType.Keywords) {
      throw new Error('Atom parsing is only supported for keyword searching');
    }
    let products;
    let res;
    try {
      this._logger.silly(
        '%s: Making request for %s/collections/all/products.json ...',
        this._name,
        this._task.store.url,
      );
      res = await this._request('/collections/all/products.json', {
        method: 'GET',
        compress: true,
        headers: {
          'User-Agent': userAgent,
        },
        agent: this._proxy,
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

    this._aborter.abort();
    return {
      ...matchedProduct,
      // insert generated product url (for restocking purposes)
      url: `${url}/products/${matchedProduct.handle}`,
    };
  }
}
