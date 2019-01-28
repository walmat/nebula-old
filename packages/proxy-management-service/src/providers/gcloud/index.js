const Provider = require('../index');
/**
 * Class for generating a Google Cloud proxy
 */
class GCloud extends Provider {
  constructor(context) {
    super(context);
    this._context = context;
  }
  // TODO - figure out methods for generating AWS proxy
}
module.exports = GCloud;
