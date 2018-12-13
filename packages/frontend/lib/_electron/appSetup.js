const nebulaEnv = require('./env');
const fetch = require('node-fetch');

nebulaEnv.setUpEnvironment();

class AppSetup {
  constructor(context) {
    this._context = context;
    this._store = context._authManager._store;
  }

  async fetchSiteList() {
    // get the current version of the user's sitelist
    const currentVersion = this._store.get('siteListVersion');
    // get the latest version of the sitelist
    let res = await fetch(`${process.env.NEBULA_API_URL}/config/sites/latest`);
    // if they're equal, don't update the list
    if (res.ok) {
      const data = await res.json();
      const { version } = JSON.parse(data);
      if (currentVersion && currentVersion === version) {
        return null;
      }
      // otherwise, fetch the newest list
      res = await fetch(
        `${process.env.NEBULA_API_URL}/config/sites/${version}`,
      );
      if (res.ok) {
        const body = await res.json();
        const { sites } = body;

        // check to see if it exists
        if (!sites) {
          const { error } = await res.json();
          console.log('[ERROR] Unable to fetch sites: ', error);
          return null;
        }

        // update the current version at this point
        this._store.set(
          'siteListVersion',
          JSON.stringify({
            version,
          }),
        );
        // return the new sitelist
        return sites;
      }
      // response !ok
      const { error } = await res.json();
      console.log(
        '[ERROR] Unable to fetch sites for version %s: %s: ',
        version,
        error,
      );
      return null;
    }
    // response !ok
    const { error } = await res.json();
    console.log(
      '[ERROR] Unable to fetch latest version, using %s: ',
      currentVersion,
      error,
    );
    return null;
  }
}

module.exports = AppSetup;
