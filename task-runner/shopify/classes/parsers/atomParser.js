const JsonParser = require('./jsonParser');
const _ = require('underscore');
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


class AtomParser extends JsonParser {
  /**
   * Construct a new AtomParser
   * 
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   * @param {Logger} (optional) A logger to log messages to
   */
  constructor(task, proxy, logger) {
    this._name = 'AtomParser';
    super(task, proxy, logger);
  }

  async run () {
    this._logger.silly('%s: starting run...', this._name);
    if (this._type !== utils.ParseType.Keywords) {
      throw new Error('Atom parsing is only supported for keyword searching');
    }
    let responseJson;
    try {
      this._logger.silly('%s: Making request for %s/collections/all.atom ...', this._name, this._task.site.url);
      const response = await rp({
        method: 'GET',
        uri: `${this._task.site.url}/collections/all.atom`,
        proxy: formatProxy(this._proxy) || undefined,
        rejectUnauthorized: false,
        json: false,
        simple: true,
        gzip: true,
        headers: {
            'User-Agent': userAgent,
        }
      });
      responseJson = await utils.convertToJson(response);
    } catch (error) {
      this._logger.silly('%s: ERROR making request!', this._name, error);
      const rethrow = new Error('unable to make request');
      rethrow.status = error.statusCode || 404; // Use the status code, or a 404 if no code is given
      throw rethrow;
    }

    this._logger.silly('%s: Received Response, attempting to translate structure...', this._name);
    const responseItems = responseJson.feed.entry;
    const products = _.map(responseItems, (item) => {
      return {
        id_raw: item.id[0],
        id: item.id[0].substring(item.id[0].lastIndexOf('/') + 1),
        url: item.link[0].$.href,
        updated_at: item.updated[0],
        title: item.title[0],
        handle: '-', // put an empty placeholder since we only have the title provided
      };
    });
    this._logger.silly('%s: Translated Structure, attempting to match', this._name);
    const matchedProduct = super.match(products);

    if(!matchedProduct) {
      this._logger.silly('%s: Couldn\'t find a match!', this._name);
      const rethrow = new Error('unable to match the product');
      rethrow.status = 500; // Use a bad status code
      throw rethrow;
    }
    this._logger.silly('%s: Product Found! Looking for Variant Info...', this._name);
    let fullProductInfo = null;
    try {
      fullProductInfo = await JsonParser.getFullProductInfo(matchedProduct.url, this._logger);
      this._logger.silly('%s: Full Product Info Found! Merging data and Returning.', this._name);
      return {
        ...matchedProduct,
        ...fullProductInfo,
      };
    } catch (errors) {
      this._logger.silly('%s: Couldn\'t Find Variant Info', this._name, errors);
      const rethrow = new Error('unable to get full product info');
      rethrow.status = 500; // Use a bad status code
      throw rethrow;
    }
  }
}
module.exports = AtomParser;
