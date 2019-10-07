import cheerio from 'cheerio';

const DsmParser = require('./dsmParser');
const { userAgent } = require('../../../common');

class DsmUkParser extends DsmParser {
  constructor(request, type, task, proxy, aborter, logger) {
    super(request, type, task, proxy, aborter, logger, 'DsmUkParser');
  }

  _parseForCustomJsLink($) {
    // Search for all script tags in the <head> element that:
    // 1. have a src attribute
    // 2. contain `custom.js` in the src
    const customJsLinks = [];
    $('script', 'head').each((_, e) => {
      const srcAttr = $(e).attr('src');
      if (srcAttr && /custom\.js/.test(srcAttr)) {
        // Perform a quick replace to make sure we use https
        if (srcAttr.startsWith('//')) {
          customJsLinks.push(`https://${srcAttr.substr(2)}`);
        } else {
          customJsLinks.push(srcAttr);
        }
      }
    });
    this._logger.silly(
      '%s: Found %d custom.js links',
      this._name,
      customJsLinks.length,
      customJsLinks,
    );
    const [customJsLink] = customJsLinks;
    if (!customJsLink) {
      throw new Error('no custom js links found!');
    }
    if (customJsLinks.length > 1) {
      this._logger.silly(
        '%s: More than 1 custom links found! using the first one: %s',
        this._name,
        customJsLink,
      );
    }

    return customJsLink;
  }

  async _getCustomJsContent(uri) {
    this._logger.silly('%s: Requesting custom js from %s ...', this._name, uri);

    return this._request(uri, {
      method: 'GET',
      agent: this._proxy,
      headers: {
        'User-Agent': userAgent,
      },
    });
  }

  _parseCustomJsContent(content) {
    // Parse for the specific code in question, capturing the
    // `input` tag that is being inserted.
    // Example:
    // $('form.product-form').append('<input type="hidden" value="ee3e8f7a9322eaa382e04f8539a7474c11555" name="properties[_hash]" />');
    const regex = /\$\(\s*'form\.product-form'\s*\)\s*\.\s*append\(\s*'(.*)'\s*\)/;
    const matches = regex.exec(content);
    if (!matches) {
      throw new Error("Couldn't find input tag in response!");
    }

    this._logger.silly('%s: Found matching element, parsing now...', this._name, matches[1]);

    // Load the input tag into cheerio to easily get the name and value attributes
    // (cheerio is used so we don't have to worry about the order of attributes)
    const tag = cheerio.load(matches[1]);
    const name = tag('input').attr('name');
    const value = tag('input').attr('value');

    // Check for correct name
    if (name !== 'properties[_hash]') {
      throw new Error(
        `Invalid name property was used ("${name}" , but was expecting "properties[_hash]").`,
      );
    }
    // Check for valid value
    if (!value) {
      throw new Error('No hash value was given!');
    }
    return value;
  }

  async parseInitialPageForHash($) {
    this._logger.silly('%s: Parsing for hash on initial page...', this._name);

    try {
      const customJsLink = this._parseForCustomJsLink($);
      const res = await this._getCustomJsContent(customJsLink);
      const body = await res.text();
      const hash = this._parseCustomJsContent(body);
      return hash;
    } catch (err) {
      this._logger.debug('%s: Error parsing custom.js! %s', this._name, err.message);
      this._logger.silly('%s: Hash parsing failed, will try again on product page...', this._name);
      return null;
    }
  }

  async parseProductInfoPageForHash($) {
    if (this._hashIds.__default__) {
      this._logger.silly(
        '%s: Default hash id already parsed! Skipping product specific hash parsing...',
        this._name,
      );
      return null;
    }
    this._logger.silly('%s: Parsing for hash on product page...', this._name);

    try {
      const customJsLink = this._parseForCustomJsLink($);
      const res = await this._getCustomJsContent(customJsLink);
      const body = await res.text();
      const hash = this._parseCustomJsContent(body);
      return hash;
    } catch (err) {
      this._logger.error(
        '%s: Error parsing custom.js! Using backup hash.. %s',
        this._name,
        err.message,
      );
      return null;
    }
  }
}

module.exports = DsmUkParser;
