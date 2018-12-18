const { app } = require('electron');
const fetch = require('node-fetch');
const fs = require('fs');
const sortBy = require('underscore').sortBy;

const nebulaEnv = require('./env');
const IPCKeys = require('../common/constants');
const sites = require('../common/sites.json');

nebulaEnv.setUpEnvironment();

class AppSetup {

  get sites() {
    let supported;
    if (nebulaEnv.isDevelopment()) {
      supported = this._sites.filter(site => site.supported === 'stable' || site.supported === 'experimental');
    } else {
      supported = this._sites.filter(site => site.supported === 'stable');
    }
    return sortBy(supported, 'name');
  }

  constructor(context) {
    this._context = context;
    this._store = context.authManager.Store;
    this._currentVersion = null;
    this._sites = null;

    context.ipc.on(IPCKeys.RequestSiteData, this._onRequestSiteData.bind(this));
  }

  async run() {
    // TODO - dev overrides
    // if (process.env.NEBULA_ENV_SITE_CONFIG) {
    //   switch (process.env.NEBULA_ENV_SITE_CONFIG) {
    //     case 'bypass': {
    //       return;
    //     }
    //     case 'clear': {
    //       this._store.set('siteListVersion', null);
    //       return;
    //     }
    //     default:
    //       break;
    //   }
    // }

    // get the current version of the user's sitelist
    this._currentVersion = this._store.get('siteListVersion');

    // get the latest version of the sitelist
    const res = await fetch(`${process.env.NEBULA_API_URL}/config/sites/latest`);

    if (!res.ok) {
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch latest site list version %s: ', error);
      if (this._currentVersion) {
        // fallback to the current version
        await this.fetchSiteListFromVersion(this._currentVersion);
      }
      // fallback to sites.json
      this._sites = JSON.parse(fs.readFileSync(sites, 'utf8'));
      return;
    }
    // get the version
    const { version } = await res.json();

    // malformed response check
    if (!version) { 
      // fetch previously stored data
      if (this._currentVersion) {
        await this.fetchSiteListFromVersion(this._currentVersion);
        return;
      }
      // fallback to sites.json
      this._sites = JSON.parse(fs.readFileSync(sites, 'utf8'));
      return;
    }
    await this.fetchSiteListFromVersion(version);
  }

  async fetchSiteListFromVersion(version) {

    if (fs.existsSync(this._store.get(`siteListLocation${version}`))) {
      // read from file instead
      this._sites = JSON.parse(fs.readFileSync(this._store.get(`siteListLocation${version}`), 'utf8'));
      return;
    }
    // fetch site list from version
    const res = await fetch(`${process.env.NEBULA_API_URL}/config/sites/${version}`);
    if (!res.ok) {
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch version %s: %s: ', version, error);
      // if we can't fetch the version, fallback to current version site data
      if (this._currentVersion && this._currentVersion !== version) {
        // recursive – if the version tried before isn't equal to the current version and we have a current version
        this.storeFilePathForVersion(this._currentVersion);
        await this.fetchSiteListFromVersion(this._currentVersion);
      }
      return;
    }
    // successful response, get the site list data
    const { sites } = await res.json();

    // check to see if it exists
    if (!sites) {
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch sites for version %s: %s ', version, error);
      await this.fetchSiteListFromVersion(this._currentVersion);
      return;
    }
    // update the sites
    this._sites = JSON.parse(JSON.stringify(sites));

    // write to the new file
    fs.writeFileSync(this._store.get(`siteListLocation${version}`), JSON.stringify(this._sites));

    // update the current version at this point
    this._store.set('siteListVersion', version);
    this.storeFilePathForVersion(version);
  }

  storeFilePathForVersion(version) {
    // Validate incoming version...
    const appDataPath = app.getPath('appData');
    // Use path.resolve to avoid mixing up `/`'s and `\`'s in file paths
    this._store.set(
      `siteListLocation${version}`,
      path.resolve(appDataPath, 'nebula-orion', `sites_${version}.json`),
    );
  }

  _onRequestSiteData(ev) {
    ev.sender.send(IPCKeys.ReceiveSiteData, this._sites);
  }
}

module.exports = AppSetup;
