const cheerio = require('cheerio');
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
  timeout: 10000,
  jar: jar,
});
const Parser = require('./parser');
const { ParseType } = require('../utils/parse');

class SpecialParser extends Parser {
  constructor(task, proxy, logger, name) {
    super(task, proxy, logger, name || 'SpecialParser');
  }

  /**
   * Getter to determine if the parser is special or not
   */
  get isSpecial() {
    return true;
  }

  async run() {
    this._logger.silly('%s: Starting run...', this._name);

    // If parse type is url, use the product's url, otherwise use the site url
    let url = this._task.site.url;
    if (this._parseType === ParseType.Url) {
      url = this._task.product.url;
    }

    // Make initial request to site
    let response;
    try {
      this._logger.silly('%s: Making request for %s ...', this._name, url);
      response = await rp({
        method: 'GET',
        uri: url,
        proxy: formatProxy(this._proxy) || undefined,
        json: false,
        simple: true,
        followRedirects: false,
        gzip: true,
        headers: {
          'User-Agent': userAgent,
        },
        transform2xxOnly: true,
        transform: (body) => {
          return cheerio.load(body);
        },
      });
    } catch (error) {
      // Handle Redirect response (wait for refresh delay)
      if (error.statusCode === 302) {
        this._logger.debug('%s: Redirect Detected!');
        const rethrow = new Error('RedirectDetected');
        rethrow.status = 500; // Use a 5xx status code to trigger a refresh delay
        throw rethrow;
      }
      // Handle other error responses
      this._logger.debug('%s: ERROR making request!', this._name, error);
      const rethrow = new Error('unable to make request');
      rethrow.status = error.statusCode || 404; // Use the status code, or a 404 is no code is given
      throw rethrow;
    }

    // Check if we need to parse the response as an initial page, or if we should treat is as
    // a direct link (when the parse type is url)
    let matchedProduct;
    if (this._type !== ParseType.Url) {
      this._logger.silly('%s: Received Response, Generating Product Info Pages to visit...', this._name);
    
      // Generate Product Pages to Visit
      let productsToVisit;
      try {
        productsToVisit = this.parseInitialPage(response);
      } catch (error) {
        this._logger.debug('%s: ERROR parsing response as initial page', this._name, error);
        const rethrow = new Error('unable to parse initial page');
        rethrow.status = error.statusCode || 404;
        throw rethrow;
      }
      this._logger.silly('%s: Generated Product Pages, capturing product page info...', this._name);

      // Visit Product Pages and Parse them for product info
      let products;
      try {
        products = await Promise.all(
          productsToVisit.map(url =>
            this.getProductInfoPage(url).then(this.parseProductInfoPage)
          ),
        );
      } catch (error) {
        this._logger.debug('%s: ERROR parsing product info page', this._name, error);
        const rethrow = new Error('unable to parse product info pages!');
        rethrow.status = error.statusCode || 404;
        throw rethrow;
      }

      // Attempt to Match Product
      try {
        matchedProduct = super.match(products);
      } catch (error) {
        this._logger.debug('%s: ERROR matching product!', this._name, error);
        const rethrow = new Error(error.message);
        rethrow.status = 404;
        throw rethrow;
      }
    } else {
      this._logger.silly('%s: Received Response, attempt to parse a product page...', this._name);

      // Attempt to parse the response as a product page and get the product info
      try {
        matchedProduct = this.parseProductInfoPage(response);
      } catch (error) {
        this._logger.debug('%s: ERROR getting product!', this._name, error);
        const rethrow = new Error(error.message);
        rethrow.status = 404;
        throw rethrow;
      }
    }

    if(!matchedProduct) {
      this._logger.silly('%s: Couldn\'t find a match!', this._name);
      throw new Error('unable to match the product');
    }
    this._logger.silly('%s: Product Found!', this._name);
    return matchedProduct;
  }

  /**
   * Parse the given html (loaded by cheerio) for a list of 
   * product pages to visit. This is a site dependent method, so it should be 
   * implemented by subclasses of this class
   * 
   * This method should return a list of product urls that should be visited for more info
   */
  parseInitialPage($) {
    throw new Error('Not Implemented! This should be implemented by subclasses!')
  }

  /**
   * Parse the given html (loaded by cheerio) as the product info page
   * for one product of interest. This is a site dependent method, so it should be
   * implemented by subclasses of this class
   * 
   * This method should a valid product object that can be further matched
   */
  parseProductInfoPage($) {
    throw new Error('Not Implemented! This should be implemented by subclasses!');
  }

  getProductInfoPage(productUrl) {
    this._logger.log('silly', '%s: Getting Full Product Info...', this._name);
    return rp({
      method: 'GET',
      productUrl,
      proxy: formatProxy(this._proxy) || undefined,
      json: false,
      simple: true,
      transform2xxOnly: true,
      gzip: true,
      headers: {
        'User-Agent': userAgent,
      },
      transform: (body) => {
        return cheerio.load(body);
      }
    });
  }
}

module.exports = SpecialParser;