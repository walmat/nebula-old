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


class XmlParser extends JsonParser {
  /**
   * Construct a new XmlParser
   * 
   * @param {Task} task the task we want to parse and match
   * @param {Proxy} the proxy to use when making requests
   */
  constructor(task, proxy) {
    console.log('[TRACE]: XmlParser: constructing...');
    super(task, proxy);
    console.log('[TRACE]: XmlParser: constructed');
  }

  async run () {
    console.log('[TRACE]: XmlParser: starting run...');
    if (this._type !== utils.ParseType.Keywords) {
      throw new Error('xml parsing is only supported for keyword searching');
    }
    let responseJson;
    try {
      console.log(`[TRACE]: XmlParser: Making request for ${this._task.site.url}/sitemap_products_1.xml ...`);
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
        }
      });
      responseJson = await utils.convertToJson(response);
    } catch (error) {
      console.log(`[TRACE]: XmlParser: ERROR making request! Error:\n${error}`);
      const rethrow = new Error('unable to make request');
      rethrow.status = error.statusCode || 404; // Use the status code, or a 404 if no code is given
      throw rethrow;
    }

    console.log('[TRACE]: XmlParser: Received Response, attempting to translate structure...');
    const responseItems = _.filter(responseJson.urlset.url, (i => i['image:image']))
    const products = _.map(responseItems, (item) => {
      return {
        url: item.loc[0],
        updated_at: item.lastmod[0],
        title: item['image:image'][0]['image:title'][0],
        handle: '-', // put an empty placeholder since we only have the title provided
      }
    });

    console.log('[TRACE]: XmlParser: Translated Structure, attempting to match');
    const matchedProduct = super.match(products);

    if(!matchedProduct) {
      console.log('[TRACE]: XmlParser: Could\'t find a match!');
      throw new Error('unable to match the product');
    }

    console.log('[TRACE]: XmlParser: Product Found! Looking for Variant Info...');
    let fullProductInfo = null;
    try {
      fullProductInfo = await JsonParser.getFullProductInfo(matchedProduct.url);
      console.log(`[TRACE]: XmlParser: Full Product Info Found! Merging data and Returning.`)
      return {
        ...matchedProduct,
        ...fullProductInfo,
      };
    } catch (errors) {
      console.log(`[TRACE]: XmlParser: Couldn't Find Variant Info:\n${errors}`);
      throw new Error('unable to get full product info');
    }
  }
}
module.exports = XmlParser;
