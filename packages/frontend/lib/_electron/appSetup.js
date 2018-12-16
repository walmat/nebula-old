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
    this._currentVersion = null;
    this._sites = null;
    this._siteListLocationKey = null;
    this._siteListLocation = null;

    context.ipc.on(IPCKeys.RequestSiteData, this._onRequestSiteData.bind(this));
  }

  async run() {
    // TODO - dev overrides
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
    this._currentVersion = this._store.get('siteListVersion');

    // get the latest version of the sitelist
    let res = await fetch(`${process.env.NEBULA_API_URL}/config/sites/latest`);

    if (!res.ok) {
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch latest site list version %s: ', error);
      if (this._currentVersion) {
        // fallback to the current version
        setSiteListKeys(this._currentVersion);
        this._store.set(this._siteListLocationKey, this._siteListLocation);
        await this.fetchSiteListFromVersion(this._currentVersion);
        return;
      }
      // get the version
      const data = await res.json();
      const { version } = JSON.parse(data);

      // otherwise, get the current version and compare the two
      if (this._currentVersion && this._currentVersion === version) {
        // TODO - if equal, just load in the current version somehow?
        setSiteListKeys(this._currentVersion);
        this._store.set(this._siteListLocationKey, this._siteListLocation);
        await this.fetchSiteListFromVersion(this._currentVersion);
        return;
      }
      // otherwise, fetch the new version's list and read it in
      await this.fetchSiteListFromVersion(version);
    }
  }

  async fetchSiteListFromVersion(version) {
    // fetch site list from version
    const res = await fetch(`${process.env.NEBULA_API_URL}/config/sites/${version}`);

    if (!res.ok) {
      const { error } = await res.json();
      console.log(
        '[ERROR] Unable to fetch version %s: %s: ',
        version,
        error,
      );
      // if we can't fetch the version, fallback to current version site data
      if (this._currentVersion && this._currentVersion !== version) {
        // recursive – if the version tried before isn't equal to the current version and we have a current version
        await this.fetchSiteListFromVersion(this._currentVersion);
      } else {
        // TODO – otherwise, fallback to the `sites.json` preshipped version in constants
      }
    }
    // SUCCESSFUL response, get the site list data
    const body = await res.json();
    const { sites } = JSON.parse(body);

    // check to see if it exists
    if (!sites) {
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch sites for version %s: %s ', version, error);
      setSiteListKeys(this._currentVersion);
      this._store.set(this._siteListLocationKey, this._siteListLocation);
      await this.fetchSiteListFromVersion(this._currentVersion);
      return;
    }
    // update the sites
    this._sites = sites;
    // update the current version at this point
    this._store.set('siteListVersion', version);
    setSiteListKeys(version);
    this._store.set(this._siteListLocationKey, this._siteListLocation);

    // write to the new file
    AppSetup.writeSiteListToFile(this._siteListLocation, sites);
  }

  setSiteListKeys(version) {
    const appDataPath = app.getPath('appData');
    this._siteListLocationKey = `siteListLocation${version}`;
    this._siteListLocation = `${appDataPath}/sites/sites_${version}.json`;
  }

  static readSiteListFromFile(location) {
    return fs.readFileSync(location);
  }

  static writeSiteListToFile(location, sites) {
    fs.writeFileSync(location, JSON.stringify(sites));
  }

  async _onRequestSiteData(ev) {
    ev.sender.send(IPCKeys.ReceiveSiteData, this._sites);
  }
}

module.exports = AppSetup;
