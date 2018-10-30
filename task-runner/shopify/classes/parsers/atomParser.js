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
   */
  constructor(task, proxy) {
    console.log('[TRACE]: AtomParser: constructing...');
    super(task, proxy);
    console.log('[TRACE]: AtomParser: constructed');
  }

  async run () {
    console.log('[TRACE]: AtomParser: starting run...');
    if (this._type !== utils.ParseType.Keywords) {
      throw new Error('Atom parsing is only supported for keyword searching');
    }
    let responseJson;
    try {
      console.log(`[TRACE]: AtomParser: Making request for ${this._task.site.url}/collections/all.atom ...`);
      const response = await rp({
        method: 'GET',
        uri: `${this._task.site.url}/collections/all.atom`,
        proxy: formatProxy(this._proxy) || undefined,
        json: false,
        simple: true,
        gzip: true,
        headers: {
            'User-Agent': userAgent,
        }
      });
      responseJson = await utils.convertToJson(response);
    } catch (error) {
      console.log(`[TRACE]: AtomParser: ERROR making request! Error:\n${error}`);
      throw new Error('unable to make request');
    }

    console.log('[TRACE]: AtomParser: Received Response, attempting to translate structure...');
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

    console.log('[TRACE]: AtomParser: Translated Structure, attempting to match');
    const matchedProduct = super.match(products);

    if(!matchedProduct) {
      console.log('[TRACE]: AtomParser: Could\'t find a match!');
      throw new Error('unable to match the product');
    }

    console.log('[TRACE]: AtomParser: Product Found! Looking for Variant Info...');
    let fullProductInfo = null;
    try {
      fullProductInfo = await JsonParser.getFullProductInfo(matchedProduct.url);
      console.log(`[TRACE]: AtomParser: Full Product Info Found! Merging data and Returning.`)
      return {
        ...matchedProduct,
        ...fullProductInfo,
      };
    } catch (errors) {
      console.log(`[TRACE]: AtomParser: Couldn't Find Variant Info:\n${errors}`);
      throw new Error('unable to get full product info');
    }
  }
}
module.exports = AtomParser;