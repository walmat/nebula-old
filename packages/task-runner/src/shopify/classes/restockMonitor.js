const {
  ErrorCodes,
  TaskRunner: { States },
} = require('./utils/constants');
const { capitalizeFirstLetter } = require('./utils');
const { Parser } = require('./parsers');
const { Monitor } = require('./monitor');

class RestockMonitor extends Monitor {
  async _delay(status) {
    // call super method to handle delay call
    await super._delay(status);
    // Return custom message so we come back to the restock monitor
    return { message: 'Running for restocks...', nextState: States.Errored }; // TODO: Change this to restocking when it gets added
  }

  async run() {
    this._logger.verbose('RESTOCK MONITOR: Monitoring for restocks...');
    // Check for Abort
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return { nextState: States.Aborted };
    }

    // Check for restock support (product has a restock url)
    const {
      product: { restockUrl },
    } = this._context.task;
    if (!restockUrl) {
      this._logger.verbose('RESTOCK MONITOR: Restock Monitor is not supported for this product!');
      const err = new Error('Restocking is not supported for this product');
      err.code = ErrorCodes.RestockingNotSupported;
      throw err;
    }

    let fullProductInfo;
    try {
      fullProductInfo = await Parser.getFullProductInfo(restockUrl, this._request, this._logger);
    } catch (errors) {
      this._logger.verbose('RESTOCK MONITOR: Getting full product info failed!');
      this._logger.debug('RESTOCK MONITOR: All requests errored out! %j', errors);
      // handle parsing errors
      return this._handleParsingErrors(errors);
    }

    // Generate Variants
    this._logger.verbose(
      'MONITOR: Retrieve Full Product %s, Generating Variants List...',
      fullProductInfo.title,
    );
    const variants = this._generateVariants(fullProductInfo);
    // check for next state (means we hit an error when generating variants)
    if (variants.nextState) {
      return variants;
    }
    this._logger.verbose('MONITOR: Variants Generated, updating context...');
    this._context.task.product.variants = variants;
    // Everything is setup -- kick it to checkout
    this._logger.verbose('MONITOR: Status is OK, proceeding to checkout');
    this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);
    return {
      message: `Found product: ${this._context.task.product.name}`,
      nextState: States.AddToCart,
    };
  }
}

module.exports = RestockMonitor;
