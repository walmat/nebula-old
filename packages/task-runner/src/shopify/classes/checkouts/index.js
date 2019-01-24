const APICheckout = require('./api');
const FrontendCheckout = require('./frontend');

function getCheckoutMethod(site, logger) {
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Determining checkout method for %s', site.url);
  if (site.url.indexOf('eflash') > -1 || site.url.indexOf('kith') > -1) {
    _logger.log('silly', 'Checkout method determined as frontend');
    return (...context) => new FrontendCheckout(...context);
  }
  _logger.log('silly', 'Checkout method determined as API');
  return (...context) => new APICheckout(...context);
}

module.exports = {
  getCheckoutMethod,
  APICheckout,
  FrontendCheckout,
};
