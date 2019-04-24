const TaskRunner = require('./taskRunner');
const { Types, States, CheckoutTypes } = require('../classes/utils/constants').TaskRunner;

class ShippingRatesRunner extends TaskRunner {
  constructor(id, task, proxy, loggerPath) {
    super(id, task, proxy, loggerPath, Types.ShippingRates);

    if (this._checkoutType === CheckoutTypes.fe) {
      this._logger.error(
        'Running for Shipping Rates is not Supported with FE Sites! Throwing error now...',
      );
      throw new Error('Running for Shipping Rates is not Supported with FE Sites!');
    }
  }

  async runSingleLoop() {
    const superShouldStop = await super.runSingleLoop();

    // Stop if we reach the PostPayment State
    if (this._state === States.PostPayment) {
      this._emitTaskEvent({
        message: 'Shipping Rates Found',
        done: true,
        rates: this._checkout.shippingMethods,
        selected: this._checkout.selectedShippingRate,
      });
      return true;
    }

    this._logger.debug('STATE: %s, PREV STATE: %s', this._state, this._prevState);

    // Stop if we error out for another reason
    if (this._state === States.Restocking || superShouldStop) {
      // Stopped before
      this._emitTaskEvent({
        message: 'Unable to get shipping rates!',
        done: true,
      });
      return true;
    }

    // Continue on...
    return false;
  }
}

module.exports = ShippingRatesRunner;
