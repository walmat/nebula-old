const Parser = require('./parser');
const { ParserType, ProductInputType } = require('../utils/constants');
const { convertToJson } = require('../utils/parse');
const { formatProxy, userAgent } = require('../utils');

class AtomParser extends Parser {
  /**
   * Construct a new AtomParser
   *
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   * @param {Logger} (optional) A logger to log messages to
   */
  constructor(request, task, proxy, logger) {
    super(request, task, proxy, logger, 'AtomParser', ParserType.Atom);
  }

  async fetch(url) {
    let responseJson;
    try {
      this._logger.silly('%s: Making request for %s/collections/all.atom ...', this._name, url);
      const response = await this._request({
        method: 'GET',
        uri: `${url}/collections/all.atom`,
        proxy: formatProxy(this._proxy) || undefined,
        rejectUnauthorized: false,
        json: false,
        simple: true,
        gzip: true,
        headers: {
          'User-Agent': userAgent,
        },
      });
      responseJson = await convertToJson(response);
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
    this._logger.silly('%s: Received Response, attempting to translate structure...', this._name);
    const responseItems = responseJson.feed.entry;
    return responseItems.map(item => ({
      id_raw: item.id[0],
      id: item.id[0].substring(item.id[0].lastIndexOf('/') + 1),
      url: item.link[0].$.href,
      updated_at: item.updated[0],
      title: item.title[0],
      handle: '-', // put an empty placeholder since we only have the title provided
      __type: this._type, // Include a tag for the type of parser used to generate this product
    }));
  }

  async run() {
    this._logger.silly('%s: starting run...', this._name);
    if (this._productInputType !== ProductInputType.Keywords) {
      throw new Error('Atom parsing is only supported for keyword searching');
    }
    const products = await this.fetch(this._task.site.url);
    this._logger.silly('%s: Translated Structure, attempting to match', this._name);
    const matchedProduct = super.match(products);

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
