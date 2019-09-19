import HttpsProxyAgent from 'https-proxy-agent';

const Parser = require('./parser');
const { convertToJson } = require('../utils/parse');
const { ParseType } = require('../utils/constants').Monitor;
const { userAgent } = require('../../../common');

class AtomParser extends Parser {
  /**
   * Construct a new AtomParser
   *
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   * @param {Logger} (optional) A logger to log messages to
   */
  constructor(request, type, task, proxy, aborter, logger) {
    super(request, type, task, proxy, aborter, logger, 'AtomParser');
  }

  async run() {
    this._logger.silly('%s: starting run...', this._name);
    if (this._type !== ParseType.Keywords) {
      throw new Error('Atom parsing is only supported for keyword searching');
    }
    let responseJson;
    try {
      this._logger.silly(
        '%s: Making request for %s/collections/all.atom ...',
        this._name,
        this._task.site.url,
      );
      const res = await this._request('/collections/all.atom', {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
        },
        agent: this._proxy ? new HttpsProxyAgent(this._proxy) : null,
      });

      if (!/429|430|ECONNREFUSED|ECONNRESET|ENOTFOUND/.test(res.status)) {
        const error = new Error('Proxy banned!');
        error.status = res.status;
        throw error;
      }

      const body = await res.text();
      responseJson = await convertToJson(body);
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

    this._logger.silly('%s: Received Response, attempting to translate structure...', this._name);
    const responseItems = responseJson.feed.entry;
    const products = responseItems.map(item => ({
      id_raw: item.id[0],
      id: item.id[0].substring(item.id[0].lastIndexOf('/') + 1),
      url: item.link[0].$.href,
      updated_at: item.updated[0],
      title: item.title[0],
      handle: '-', // put an empty placeholder since we only have the title provided
    }));
    this._logger.silly('%s: Translated Structure, attempting to match', this._name);
    const matchedProduct = await super.match(products);

    if (!matchedProduct) {
      this._logger.silly("%s: Couldn't find a match!", this._name);
      const rethrow = new Error('unable to match the product');
      rethrow.status = 500; // Use a bad status code
      throw rethrow;
    }
    this._logger.silly('%s: Product Found! Looking for Variant Info...', this._name);
    let fullProductInfo = null;
    try {
      fullProductInfo = await Parser.getFullProductInfo(
        matchedProduct.url,
        this._proxy,
        this._request,
        this._logger,
      );
      this._logger.silly('%s: Full Product Info Found! Merging data and Returning.', this._name);
      this._aborter.abort();
      return {
        ...matchedProduct,
        ...fullProductInfo,
        url: matchedProduct.url, // Use known good product url
      };
    } catch (errors) {
      this._logger.silly("%s: Couldn't Find Variant Info", this._name, errors);
      const rethrow = new Error('unable to get full product info');
      rethrow.status = 500; // Use a bad status code
      throw rethrow;
    }
  }
}
module.exports = AtomParser;
