const { app } = require('electron');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const nebulaEnv = require('./env');

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
    const appDataPath = app.getPath('appData');

    const siteListLocationKey = `siteListLocation${version}`;
    const siteListLocation = `${appDataPath}/sites/sites_${version}.json`;

    // store the new versions path to the file
    this._store.set(siteListLocationKey, siteListLocation);

    // write to the new file
    AppSetup.writeSiteListToFile(siteListLocation, sites);
  }

  static writeSiteListToFile(location, sites) {
    fs.writeFileSync(location, JSON.stringify(sites));
  }
}

module.exports = AppSetup;
