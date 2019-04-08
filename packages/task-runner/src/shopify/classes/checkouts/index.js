const APICheckout = require('./api');
const FrontendCheckout = require('./frontend');
const {
  TaskRunner: { CheckoutTypes },
} = require('../utils/constants');

function getCheckoutMethod(site, logger) {
  const _logger = logger || { log: () => {} };
  // _logger.log('silly', 'Determining checkout method for %s', site.url);
  if (site.special) {
    // _logger.log('silly', 'Checkout method determined as frontend');
    return (...context) => [CheckoutTypes.fe, new FrontendCheckout(...context)];
  }
  // _logger.log('silly', 'Checkout method determined as API');
  return (...context) => [CheckoutTypes.api, new APICheckout(...context)];
}

module.exports = {
  getCheckoutMethod,
  APICheckout,
  FrontendCheckout,
};
