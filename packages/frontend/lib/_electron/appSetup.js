const nebulaEnv = require('./env');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

nebulaEnv.setUpEnvironment();

class AppSetup {
  constructor(context) {
    this._context = context;
    this._store = context.authManager.Store;
  }

  async fetchSiteList() {
    // dev overrides
    if (process.env.NEBULA_ENV_SITE_CONFIG) {
      switch (process.env.NEBULA_ENV_SITE_CONFIG) {
        case 'bypass': {
          return;
        }
        case 'clear': {
          this._store.set('siteListVersion', null);
          return;
        }
        default:
          break;
      }
    }

    // get the current version of the user's sitelist
    const currentVersion = this._store.get('siteListVersion');
    // get the latest version of the sitelist
    let res = await fetch(`${process.env.NEBULA_API_URL}/config/sites/latest`);
    if (!res.ok) {
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch version %s: ', error);
      return;
    }
    // get the version
    const data = await res.json();
    const { version } = JSON.parse(data);

    // otherwise, get the current version and compare the two
    if (currentVersion && currentVersion === version) {
      // if equal, don't bother updating the list (as they should be the same)
      return;
    }
    // otherwise, fetch the new list
    res = await fetch(`${process.env.NEBULA_API_URL}/config/sites/${version}`);
    if (!res.ok) {
      const { error } = await res.json();
      console.log(
        '[ERROR] Unable to fetch newest version %s: %s: ',
        version,
        error,
      );
      return;
    }
    // get the site list data
    const body = await res.json();
    const { sites } = JSON.parse(body);

    // check to see if it exists
    if (!sites) {
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch sites: ', error);
      return;
    }

    // update the current version at this point
    this._store.set('siteListVersion', version);

    // store the new versions path to the file
    this._store.set(
      `siteListLocation${version}`,
      `../common/sites/sites_${version}.json`,
    );

    // write the new file
    AppSetup.writeSiteListToFile(
      sites,
      this._store.get(`siteListLocation${version}`),
    );
  }

  static writeSiteListToFile(sites, location) {
    fs.writeFileSync(
      path.join(__dirname, location),
      JSON.stringify(sites, null, 2),
    );
  }
}

module.exports = AppSetup;
