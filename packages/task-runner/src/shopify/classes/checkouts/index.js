const FastCheckout = require('./fast');
const SafeCheckout = require('./safe');
const {
  TaskRunner: { Modes },
} = require('../utils/constants');

function getCheckoutMethod(site, type, logger) {
  const _logger = logger || { log: () => {} };
  _logger.log('silly', 'Determining checkout method for %s', site.url);

  switch (type) {
    case Modes.SAFE: {
      _logger.log('silly', 'SAFE MODE for %s', site.url);
      return (...context) => new SafeCheckout(...context);
    }
    case Modes.FAST: {
      _logger.log('silly', 'FAST MODE for %s', site.url);
      return (...context) => new FastCheckout(...context);
    }
    default: {
      return (...context) => new SafeCheckout(...context);
    }
  }
}

module.exports = {
  getCheckoutMethod,
  FastCheckout,
  SafeCheckout,
};
