const nebulaEnv = require('./env');
const IPCKeys = require('../common/constants');

nebulaEnv.setUpEnvironment();

class AppSetup {
  constructor(context) {
    this._context = context;
    this._version = context.version;
  }

  async fetchSiteList() {
    const version = await fetch(
      `${process.env.NEBULA_API_URL}/config/sites/latest`,
    );

    if (version && version === this._context.version) {
      return null;
    }

    const sites = await fetch(
      `${process.env.NEBULA_API_URL}/config/sites/${version}`,
    );
    if (!sites) {
      return null;
    }
    return sites;
  }
}

module.exports = AppSetup;
