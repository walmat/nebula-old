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
  constructor(request, task, proxy, logger) {
    super(request, task, proxy, logger, 'XmlParser');
    this._request = request;
  }

  async run() {
    this._logger.silly('%s: starting run...', this._name);
    if (this._type !== ParseType.Keywords) {
      throw new Error('xml parsing is only supported for keyword searching');
    }
    let responseJson;
    try {
      this._logger.silly(
        '%s: Making request for %s/sitemap_products_1.xml?from=1&to=299999999999999999 ...',
        this._name,
        this._task.site.url,
      );
      const response = await this._request({
        method: 'GET',
        uri: `${this._task.site.url}/sitemap_products_1.xml?from=1&to=299999999999999999`,
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
    const responseItems = responseJson.urlset.url.filter(i => i['image:image']);
    const products = responseItems.map(item => ({
      url: item.loc[0],
      updated_at: item.lastmod[0],
      title: item['image:image'][0]['image:title'][0],
      handle: item.loc[0].substring(item.loc[0].lastIndexOf('/')),
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
      fullProductInfo = await Parser.getFullProductInfo(
        matchedProduct.url,
        this._request,
        this._logger,
      );
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
