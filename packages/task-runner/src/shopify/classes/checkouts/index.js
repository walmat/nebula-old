const APICheckout = require('./api');
const SafeAPICheckout = require('./safeApi');
const FrontendCheckout = require('./frontend');
const SafeFrontendCheckout = require('./safeFrontend');
const {
  TaskRunner: { CheckoutTypes, Modes },
} = require('../utils/constants');

function getCheckoutMethod(site, type, logger) {
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Determining checkout method for %s', site.url);
  if (site.special) {
    _logger.log('silly', 'Checkout method determined as special');
    switch (type) {
      case Modes.SAFE: {
        return (...context) => [CheckoutTypes.fe, new SafeFrontendCheckout(...context)];
      }
      case Modes.FAST: {
        return (...context) => [CheckoutTypes.fe, new FrontendCheckout(...context)];
      }
      default: {
        return (...context) => [CheckoutTypes.fe, new SafeFrontendCheckout(...context)];
      }
    }
  }

  switch (type) {
    case Modes.SAFE: {
      return (...context) => [CheckoutTypes.api, new SafeAPICheckout(...context)];
    }
    case Modes.FAST: {
      return (...context) => [CheckoutTypes.api, new APICheckout(...context)];
    }
    default: {
      return (...context) => [CheckoutTypes.api, new SafeAPICheckout(...context)];
    }
  }
}

module.exports = {
  getCheckoutMethod,
  APICheckout,
  FrontendCheckout,
};
