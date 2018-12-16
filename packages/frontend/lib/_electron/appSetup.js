const { app } = require('electron');
const fetch = require('node-fetch');
const fs = require('fs');

const nebulaEnv = require('./env');
const IPCKeys = require('../common/constants');

nebulaEnv.setUpEnvironment();

class AppSetup {
  constructor(context) {
    this._context = context;
    this._store = context.authManager.Store;
    this._sites = null;
    this._siteListLocationKey = null;
    this._siteListLocation = null;

    context.ipc.on(IPCKeys.RequestSiteData, this._onRequestSiteData.bind(this));
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
      // TODO - can't fetch latest site, fall back to their current version
      // if current version, ship out current version site data
      // if no current version, fallback to sites.json
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch version %s: ', error);
      return;
    }
    // get the version
    const data = await res.json();
    const { version } = JSON.parse(data);

    // otherwise, get the current version and compare the two
    if (currentVersion && currentVersion === version) {
      // TODO - if equal, load in the current content
      return;
    }
    // TODO - otherwise, fetch the new list and read it in
    res = await fetch(`${process.env.NEBULA_API_URL}/config/sites/${version}`);
    if (!res.ok) {
      // TODO - if unable to fetch new list, fallback to users current version
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
      // TODO - if no site data, fall back to users current version
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch sites: ', error);
      return;
    }
    // TODO - otherwise, ship new version
    this._sites = sites;
    // update the current version at this point
    this._store.set('siteListVersion', version);
    const appDataPath = app.getPath('appData');

    this._siteListLocationKey = `siteListLocation${version}`;
    this._siteListLocation = `${appDataPath}/sites/sites_${version}.json`;

    // store the new versions path to the file
    this._store.set(this._siteListLocationKey, this._siteListLocation);

    // write to the new file
    AppSetup.writeSiteListToFile(this._siteListLocation, sites);
  }

  static writeSiteListToFile(location, sites) {
    fs.writeFileSync(location, JSON.stringify(sites));
  }

  async _onRequestSiteData(ev) {
    ev.sender.send(this._sites);
  }
}

module.exports = AppSetup;
