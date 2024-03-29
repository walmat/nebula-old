/* eslint-disable class-methods-use-this */
import cheerio from 'cheerio';
import Parser from './parser';
import { userAgent } from '../../common';
import { ErrorCodes, Monitor } from '../utils/constants';

const { ParseType } = Monitor;

export default class SpecialParser extends Parser {
  constructor(request, type, task, proxy, aborter, logger, random, name) {
    super(request, type, task, proxy, aborter, logger, random, name || 'SpecialParser');
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
    const { url: siteUrl } = this._task.site;
    let initialUrl = siteUrl;
    if (this._type === ParseType.Url) {
      initialUrl = this._task.product.url;
    }

    // Make initial request to site
    let response;
    try {
      this._logger.silly('%s: Making request for %s ...', this._name, initialUrl);

      const res = await this._request(initialUrl, {
        method: 'GET',
        redirect: 'follow',
        follow: 5,
        compress: true,
        agent: this._proxy,
        headers: {
          'User-Agent': userAgent,
        },
      });

      this._logger.info('SPECIAL PARSER INITIAL RESPONSE STATUS: %j', res.status);

      if (/429|430/.test(res.status)) {
        const rethrow = new Error('Proxy Banned!');
        rethrow.status = res.status;
        throw rethrow;
      }

      if (res.redirected) {
        const redirectUrl = res.url;

        if (/password/.test(redirectUrl)) {
          const rethrow = new Error('PasswordPage');
          rethrow.status = ErrorCodes.PasswordPage;
          throw rethrow;
        }

        // TODO: Maybe replace with a custom error object?
        const rethrow = new Error('RedirectDetected');
        rethrow.status = res.status || 500; // Use a 5xx status code to trigger a refresh delay
        throw rethrow;
      }

      const body = await res.text();

      if (/travis/i.test(initialUrl)) {
        response = body;
      } else {
        response = cheerio.load(body, {
          normalizeWhitespace: true,
          xmlMode: false,
        });
      }
    } catch (error) {
      // Handle other error responses
      this._logger.error(
        '%s: %s ERROR making request! %s',
        this._name,
        error.status,
        error.messsage,
      );

      if (error && error.type && error.type === 'system') {
        const rethrow = new Error(error.errno);
        rethrow.status = error.code;
        throw rethrow;
      }

      const rethrow = new Error(error.message || 'Unable to make request');
      rethrow.status = error.status || 404; // Use the status code, or a 404 is no code is given
      throw rethrow;
    }

    // Check if we need to parse the response as an initial page, or if we should treat is as
    // a direct link (when the parse type is url)
    let matchedProduct;
    if (this._type !== ParseType.Url) {
      this._logger.silly(
        '%s: Received Response, Generating Product Info Pages to visit...',
        this._name,
      );

      let products;
      if (this.initialPageContainsProducts) {
        // Attempt to parse the initial page for product data
        try {
          products = await this.parseInitialPageForProducts.call(this, response);
        } catch (error) {
          this._logger.error(
            '%s: ERROR parsing response as initial page %j %j',
            this._name,
            error.message,
            error.stack,
          );
          if (error && error.type && error.type === 'system') {
            const rethrow = new Error(error.errno);
            rethrow.status = error.code;
            throw rethrow;
          }
          // TODO: Maybe replace with a custom error object?
          const rethrow = new Error('unable to parse initial page');
          rethrow.status = error.status || 404;
          throw rethrow;
        }
      } else {
        // Generate Product Pages to Visit
        let productsToVisit;
        try {
          productsToVisit = await this.parseInitialPageForUrls.call(this, response);
        } catch (error) {
          this._logger.error(
            '%s: ERROR parsing response as initial page %j %j',
            this._name,
            error.message,
            error.stack,
          );
          if (error && error.type && error.type === 'system') {
            const rethrow = new Error(error.errno);
            rethrow.status = error.code;
            throw rethrow;
          }
          // TODO: Maybe replace with a custom error object?
          const rethrow = new Error('unable to parse initial page');
          rethrow.status = error.status || 404;
          throw rethrow;
        }
        this._logger.silly(
          '%s: Generated Product Pages, capturing product page info...',
          this._name,
          productsToVisit,
        );

        // Visit Product Pages and Parse them for product info
        products = (await Promise.all(
          productsToVisit.map(async url => {
            try {
              const $ = await this.getProductInfoPage(url);
              const productInfo = await this.parseProductInfoPageForProduct.call(this, $);
              return {
                url, // Attach product url for restocking purposes
                ...productInfo,
              };
            } catch (err) {
              this._logger.error(
                '%s: %s error parsing product info page. %j',
                this._name,
                err.status,
                err.message,
              );
              return null;
            }
          }),
        )).filter(p => p);
      }

      // Attempt to Match Product
      this._logger.silly(
        '%s: Received Product info from %d products, matching now...',
        this._name,
        products.length,
      );
      try {
        matchedProduct = await super.match(products);
      } catch (error) {
        this._logger.error('%s: ERROR matching product!', this._name, error);
        // TODO: Maybe replace with a custom error object?
        const rethrow = new Error(error.message);
        rethrow.status = error.status || 404;
        throw rethrow;
      }
    } else {
      this._logger.silly('%s: Received Response, attempt to parse as product page...', this._name);

      // Attempt to parse the response as a product page and get the product info
      try {
        matchedProduct = await this.parseProductInfoPageForProduct.call(this, response);
      } catch (error) {
        this._logger.error('%s: ERROR getting product!', this._name, error);
        // TODO: Maybe replace with a custom error object?
        const rethrow = new Error(error.message);
        rethrow.status = error.status || 404;
        throw rethrow;
      }
    }

    if (!matchedProduct) {
      this._logger.silly("%s: Couldn't find a match!", this._name);
      // TODO: Maybe replace with a custom error object?
      const rethrow = new Error('unable to match the product');
      rethrow.status = ErrorCodes.ProductNotFound;
      throw rethrow;
    }
    this._logger.silly('%s: Product Found!', this._name);
    return {
      // Backup method to add product url for restocking purposes
      url: `${siteUrl}/products/${matchedProduct.handle}`,
      ...matchedProduct,
    };
  }

  /**
   * Getter to signify whether or not the specific site has product info in the
   * initial site page, or if product specific pages need to be parsed.
   *
   * If this is set to true, then `parseInitialPageForProducts()` will get called
   * If this is set to false, then `parseInitialPageForUrls()` will get called
   */
  get initialPageContainsProducts() {
    throw new Error('Not Implemented! This should be implemented by subclasses!');
  }

  /**
   * Parse the given html (loaded by cheerio) for a list of
   * products available. This is a site dependent method, so it should be
   * implemented by subclasses of this class
   *
   * This method should return a list of products that should be matched
   *
   * NOTE: This method is only run if `this.initialPageContainsProducts` is true
   *
   * @param {Cheerio Instance} $ - Instance of cheerio loaded with html content
   */
  // eslint-disable-next-line no-unused-vars
  parseInitialPageForProducts($) {
    throw new Error('Not Implemented! This should be implemented by subclasses!');
  }

  /**
   * Parse the given html (loaded by cheerio) for a list of
   * product pages to visit. This is a site dependent method, so it should be
   * implemented by subclasses of this class
   *
   * This method should return a list of product urls that should be visited for more info
   *
   * NOTE: This method is only run if `this.initialPageContainsProducts` is true
   *
   * @param {Cheerio Instance} $ - Instance of cheerio loaded with html content
   */
  // eslint-disable-next-line no-unused-vars
  parseInitialPageForUrls($) {
    throw new Error('Not Implemented! This should be implemented by subclasses!');
  }

  /**
   * Parse the given html (loaded by cheerio) as the product info page
   * for one product of interest. This is a site dependent method, so it should be
   * implemented by subclasses of this class
   *
   * This method should a valid product object that can be further matched
   *
   * @param {Cheerio Instance} $ - Instance of cheerio loaded with html content
   */
  // eslint-disable-next-line no-unused-vars
  parseProductInfoPageForProduct($) {
    throw new Error('Not Implemented! This should be implemented by subclasses!');
  }

  async getProductInfoPage(productUrl) {
    this._logger.log('silly', '%s: Getting Full Product Info... %s', this._name, productUrl);

    try {
      const res = await this._request(productUrl, {
        method: 'GET',
        redirect: 'follow',
        follow: 5,
        agent: this._proxy,
        headers: {
          'User-Agent': userAgent,
        },
      });

      const { url: redirectUrl } = res;

      if (redirectUrl) {
        if (/password/i.test(redirectUrl)) {
          const error = new Error('Password Page');
          error.status = ErrorCodes.PasswordPage;
          throw error;
        }
      }

      const body = await res.text();

      // for traviss let's use regex instead of cheerio..
      if (/travis/i.test(this._task.site.url)) {
        return body;
      }

      const response = cheerio.load(body, {
        normalizeWhitespace: true,
        xmlMode: false,
      });

      return response;
    } catch (e) {
      throw e;
    }
  }
}
