const { APICheckout } = require('./api');
const { FrontendCheckout } = require('./frontend');

const CheckoutMethods = {
  Api: 'API',
  Frontend: 'FRONTEND',
};

function getCheckoutMethod(site, logger) {
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Determining checkout method', site.name);
  if (site.url.includes('eflash') > -1) {
    _logger.log('silly', 'Checkout method determined as frontend');
    return CheckoutMethods.Frontend;
  }
  _logger.log('silly', 'Checkout method determined as API');
  return CheckoutMethods.Api;
}

module.exports = {
  CheckoutMethods,
  getCheckoutMethod,
  APICheckout,
  FrontendCheckout,
};
