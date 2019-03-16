const TaskRunner = require('./taskRunner');
const { Types, States, CheckoutTypes } = require('./classes/utils/constants').TaskRunner;

class ShippingRatesRunner extends TaskRunner {
  constructor(...params) {
    super(...params);

    // Specify the Runner Type
    this._type = Types.ShippingRate;

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
        rates: this._checkout.shippingRates,
        selected: this._checkout.selectedShippingRate,
      });
      return true;
    }

    // Stop if we error out for another reason
    if (superShouldStop) {
      // Stopped before
      this._emitTaskEvent({
        message: 'Unable to get shipping rates!',
      });
      return true;
    }

    // Continue on...
    return false;
  }
}

module.exports = ShippingRatesRunner;
