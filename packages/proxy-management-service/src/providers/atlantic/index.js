const Provider = require('../index');
/**
 * Super class for shared variables / methods between providers
 */
class Atlantic extends Provider {
  constructor(context) {
    super(context);
    this._context = context;
  }
  // TODO - figure out methods for generating Atlantic proxy
}
module.exports = Atlantic;
