import { Utils, Constants } from '../../common';
import { Parse } from '../utils';

const { ErrorCodes, Monitor } = Constants;
const { convertToJson, getFullProductInfo, match } = Parse;
const { userAgent } = Utils;
const { ParseType } = Monitor;

export default class XmlParser {
  get context() {
    return this._context;
  }

  constructor(context, aborter, fetch) {
    this._context = context;
    this._aborter = aborter;
    this._fetch = fetch;
  }

  async run() {
    const { logger, parseType, task, proxy } = this.context;
    logger.silly('Starting sitemap parser!');
    if (parseType !== ParseType.Keywords) {
      throw new Error(`Improper parse type: ${parseType} (XML Parser)`);
    }

    let responseJson;
    try {
      logger.silly('Making request for %s/sitemap_products_1.xml', task.store.url);
      const res = await this._fetch('/sitemap_products_1.xml?from=1&to=299999999999999999', {
        method: 'GET',
        compress: true,
        headers: {
          'user-agent': userAgent,
        },
        agent: proxy ? proxy.proxy : null,
      });

      if (/429|430|403/.test(res.status)) {
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
      logger.silly('ERROR making request! %s %d', error.name, error.status);
      const rethrow = new Error('Unable to make request');
      rethrow.status = error.status || 404; // Use the status code, or a 404 if no code is given
      rethrow.name = error.name;
      throw rethrow;
    }
    logger.silly('Received response! Attempting to translate');
    const responseItems = responseJson.urlset.url.filter(i => i['image:image']);
    const products = responseItems.map(item => ({
      url: item.loc[0],
      updated_at: item.lastmod[0],
      title: item['image:image'][0]['image:title'][0],
      handle: item.loc[0].substring(item.loc[0].lastIndexOf('/')),
    }));
    logger.silly('Translated! Attempting to match');
    const matchedProduct = await match(this.context, products);

    if (!matchedProduct) {
      logger.silly("Couldn't find a match!");
      const error = new Error('ProductNotMatched');
      error.status = ErrorCodes.NoMatchesFound;
      throw error;
    }
    logger.silly('%s: Product Found! Looking for Variant Info...', this._name);
    let fullProductInfo = null;
    try {
      fullProductInfo = await getFullProductInfo(this._fetch, matchedProduct.url, proxy, logger);
      logger.silly('Full Product Info Found!');
      return {
        ...matchedProduct,
        ...fullProductInfo,
        url: matchedProduct.url, // Use known good product url
      };
    } catch (error) {
      logger.silly("Couldn't Find Variant Info", error);
      throw error;
    }
  }
}
