/**
 * Super class for shared variables / methods between providers
 */
class Provider {
  constructor(context) {
    this._context = context;
  }
  // TODO - figure out shared methods for generating proxies
}
module.exports = Provider;
