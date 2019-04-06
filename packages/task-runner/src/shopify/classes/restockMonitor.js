const {
  ErrorCodes,
  TaskRunner: { States },
} = require('./utils/constants');
const { capitalizeFirstLetter } = require('./utils');
const { Parser } = require('./parsers');
const Monitor = require('./monitor');

class RestockMonitor extends Monitor {
  async _delay(status) {
    // call super method to handle delay call
    await super._delay(status);
    // Return custom message so we come back to the restock monitor
    return { message: 'Running for restocks', nextState: States.Restocking };
  }

  async run() {
    this._logger.silly('RESTOCK MONITOR: Monitoring for restocks...');
    // Check for Abort
    if (this._context.aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return { nextState: States.Aborted };
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
      fullProductInfo = await Parser.getFullProductInfo(restockUrl, this._request, this._logger);
    } catch (errors) {
      this._logger.error('RESTOCK MONITOR: Getting full product info failed! %j', errors);
      // handle parsing errors
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
    // Everything is setup -- kick it to checkout
    this._logger.silly('RESTOCK MONITOR: Status is OK, proceeding to checkout');
    this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);
    return {
      message: `Product restocked: ${this._context.task.product.name}`,
      nextState: States.AddToCart,
    };
  }
}

module.exports = RestockMonitor;
