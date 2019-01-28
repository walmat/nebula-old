const Provider = require('../index');
/**
 * Super class for shared variables / methods between providers
 */
class DGOcean extends Provider {
  constructor(context) {
    super(context);
    this._context = context;
  }
  // TODO - figure out methods for generating Digital Ocean proxy
}
module.exports = DGOcean;
