const FastCheckout = require('./fast');
const SafeCheckout = require('./safe');
const {
  TaskRunner: { CheckoutTypes, Modes },
} = require('../utils/constants');

function getCheckoutMethod(site, type, logger) {
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Determining checkout method for %s', site.url);

  switch (type) {
    case Modes.SAFE: {
      return (...context) => [CheckoutTypes.fe, new SafeCheckout(...context)];
    }
    case Modes.FAST: {
      return (...context) => [CheckoutTypes.fe, new FastCheckout(...context)];
    }
    default: {
      return (...context) => [CheckoutTypes.fe, new SafeCheckout(...context)];
    }
  }
  // if (site.special) {
  //   _logger.log('silly', 'Checkout method determined as special');
  //   switch (type) {
  //     case Modes.SAFE: {
  //     }
  //     case Modes.FAST: {
  //     }

  //   }
  // }

  // switch (type) {
  //   case Modes.SAFE: {
  //     return (...context) => [CheckoutTypes.api, new SafeAPICheckout(...context)];
  //   }
  //   case Modes.FAST: {
  //     return (...context) => [CheckoutTypes.api, new APICheckout(...context)];
  //   }
  //   default: {
  //     return (...context) => [CheckoutTypes.api, new SafeAPICheckout(...context)];
  //   }
  // }
}

module.exports = {
  getCheckoutMethod,
  FastCheckout,
  SafeCheckout,
};
