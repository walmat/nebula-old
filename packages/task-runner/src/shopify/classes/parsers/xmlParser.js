const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
  timeout: 10000,
  jar,
});

const Parser = require('./parser');
const { ParseType, convertToJson } = require('../utils/parse');
const { formatProxy, userAgent } = require('../utils');

class XmlParser extends Parser {
  /**
   * Construct a new XmlParser
   *
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   */
  constructor(task, proxy, logger) {
    super(task, proxy, logger, 'XmlParser');
  }

  async run() {
    this._logger.silly('%s: starting run...', this._name);
    if (this._type !== ParseType.Keywords) {
      throw new Error('xml parsing is only supported for keyword searching');
    }
    let responseJson;
    try {
      this._logger.silly(
        '%s: Making request for %s/sitemap_products_1.xml ...',
        this._name,
        this._task.site.url,
      );
      const response = await rp({
        method: 'GET',
        uri: `${this._task.site.url}/sitemap_products_1.xml`,
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
      this._logger.silly('%s: ERROR making request!', this._name, error);
      const rethrow = new Error('unable to make request');
      rethrow.status = error.statusCode || 404; // Use the status code, or a 404 if no code is given
      throw rethrow;
    }
    this._logger.silly('%s: Received Response, attempting to translate structure...', this._name);
    const responseItems = responseJson.urlset.url.filter(i => i['image:image']);
    const products = responseItems.map(item => ({
      url: item.loc[0],
      updated_at: item.lastmod[0],
      title: item['image:image'][0]['image:title'][0],
      handle: '-', // put an empty placeholder since we only have the title provided
    }));
    this._logger.silly('%s: Translated Structure, attempting to match', this._name);
    const matchedProduct = super.match(products);

    if (!matchedProduct) {
      this._logger.silly("%s: Couldn't find a match!", this._name);
      throw new Error('unable to match the product');
    }
    this._logger.silly('%s: Product Found! Looking for Variant Info...', this._name);
    let fullProductInfo = null;
    try {
      fullProductInfo = await Parser.getFullProductInfo(matchedProduct.url, this._logger);
      this._logger.silly('%s: Full Product Info Found! Merging data and Returning.', this._name);
      return {
        ...matchedProduct,
        ...fullProductInfo,
      };
    } catch (errors) {
      this._logger.silly("%s: Couldn't Find Variant Info", this._name, errors);
      throw new Error('unable to get full product info');
    }
  }
}
module.exports = XmlParser;
