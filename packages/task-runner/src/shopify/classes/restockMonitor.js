const {
  ErrorCodes,
  TaskRunner: { States },
} = require('./utils/constants');
const { capitalizeFirstLetter } = require('./utils');
const { ParseType } = require('./utils/parse');
const { Parser } = require('./parsers');
const Monitor = require('./monitor');

class RestockMonitor extends Monitor {
  async _handleParsingErrors(errors) {
    const { monitorDelay } = this._context.task;
    const { message, shouldBan, nextState } = await super._handleParsingErrors(errors);

    if (nextState !== States.MONITOR && nextState !== States.RESTOCK) {
      return { message, shouldBan, nextState };
    }

    this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms` });
    return { message: `Out of stock! Delaying ${monitorDelay}ms`, nextState: States.RESTOCK };
  }

  async checkStock() {
    const {
      product: { restockUrl },
    } = this._context.task;

    let stock;
    try {
      switch (Parser.isSpecial()) {
        case ParseType.Special: {
          let response;
          try {
            this._logger.silly('%s: Making request for %s ...', this._name, initialUrl);

            const res = await this._request(restockUrl, {
              method: 'GET',
              redirect: 'follow',
              agent: this._proxy ? new HttpsProxyAgent(this._proxy) : null,
              headers: {
                'User-Agent': userAgent,
              },
            });

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
            response = cheerio.load(body, {
              normalizeWhitespace: true,
              xmlMode: true,
            });

          } catch (error) {
            throw [error];
          }

          stock = await this.parseProductInfoPageForProduct.call(this, response);
          break;
        }
        default: {
          stock = await Parser.getFullProductInfo(
            restockUrl,
            this._context.proxy,
            this._request,
            this._logger,
          );
        }
      } 
    } catch (errors) {
      // bubble these up!
      throw errors;
    }
    return stock;
  }

  async run() {
    this._logger.silly('RESTOCK MONITOR: Monitoring for restocks...');
    // Check for Abort
    if (this._context.aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return { nextState: States.ABORT };
    }

    // Check for restock support (product has a restock url)
    const {
      product: { restockUrl },
    } = this._context.task;
    if (!restockUrl) {
      this._logger.silly('RESTOCK MONITOR: Restock Monitor is not supported for this product!');
      const err = new Error('Restocking is not supported for this product');
      err.code = ErrorCodes.RestockingNotSupported;
      throw err;
    }

    let fullProductInfo;
    try {
      fullProductInfo = await this.checkStock();
    } catch (errors) {
      this._logger.error('RESTOCK MONITOR: Getting full product info failed! %j', errors);
      return this._handleParsingErrors(errors);
    }

    // Generate Variants
    this._logger.silly(
      'RESTOCK MONITOR: Retrieve Full Product %s, Generating Variants List...',
      fullProductInfo.title,
    );
    const { variants, sizes, nextState, message } = this._generateVariants(fullProductInfo);
    // check for next state (means we hit an error when generating variants)
    if (nextState) {
      return { nextState, message };
    }
    this._logger.silly('RESTOCK MONITOR: Variants Generated, updating context...');
    this._context.task.product.variants = variants;
    this._context.task.product.chosenSizes = sizes;
    this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);
    // Everything is setup -- kick it to checkout
    this._logger.silly('RESTOCK MONITOR: Status is OK, proceeding to checkout');
    return {
      message: `Variant restocked: ${this._context.task.product.chosenSizes}`,
      nextState: States.ADD_TO_CART,
    };
  }
}

module.exports = RestockMonitor;
