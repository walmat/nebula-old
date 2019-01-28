const Provider = require('../index');
/**
 * Super class for shared variables / methods between providers
 */
class OneHundredTB extends Provider {
  constructor(context) {
    super(context);
    this._context = context;
  }
  // TODO - figure out methods for generating OneHundredTB proxy
}
module.exports = OneHundredTB;
