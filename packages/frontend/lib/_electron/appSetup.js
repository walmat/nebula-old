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
    const res = await fetch(`${process.env.NEBULA_API_URL}/config/sites/latest`);

    if (!res.ok) {
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch latest site list version %s: ', error);
      if (this._currentVersion) {
        // fallback to the current version
        const { siteListLocationKey, siteListLocation } = AppSetup.getVersionFileKeyAndPath(
          this._currentVersion,
        );
        this._store.set(siteListLocationKey, siteListLocation);
        await this.fetchSiteListFromVersion(this._currentVersion);
      }
      return;
    }
    // get the version
    const { version } = await res.json();

    // otherwise, get the current version and compare the two
    if (this._currentVersion && this._currentVersion === version) {
      const { siteListLocationKey, siteListLocation } = AppSetup.getVersionFileKeyAndPath(
        this._currentVersion,
      );
      this._store.set(siteListLocationKey, siteListLocation);
      if (fs.existsSync(siteListLocation)) {
        // read from file instead
        this._sites = JSON.parse(fs.readFileSync(siteListLocation, 'utf8'));
      } else {
        // can't find file.. try to fetch current version
        await this.fetchSiteListFromVersion(this._currentVersion);
      }
      return;
    }
    // otherwise, fetch the new version's list and read it in
    await this.fetchSiteListFromVersion(version);
  }

  async fetchSiteListFromVersion(version) {
    // fetch site list from version
    const res = await fetch(`${process.env.NEBULA_API_URL}/config/sites/${version}`);
    if (!res.ok) {
      const { error } = await res.json();
      console.log('[ERROR] Unable to fetch version %s: %s: ', version, error);
      // if we can't fetch the version, fallback to current version site data
      if (this._currentVersion && this._currentVersion !== version) {
        // recursive – if the version tried before isn't equal to the current version and we have a current version
        const { siteListLocationKey, siteListLocation } = AppSetup.getVersionFileKeyAndPath(
          this._currentVersion,
        );
        this._store.set(siteListLocationKey, siteListLocation);
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
      const { siteListLocationKey, siteListLocation } = AppSetup.getVersionFileKeyAndPath(
        this._currentVersion,
      );
      this._store.set(siteListLocationKey, siteListLocation);
      await this.fetchSiteListFromVersion(this._currentVersion);
      return;
    }
    // update the sites
    this._sites = JSON.parse(JSON.stringify(sites));
    // update the current version at this point
    this._store.set('siteListVersion', version);
    const { siteListLocationKey, siteListLocation } = AppSetup.getVersionFileKeyAndPath(version);
    this._store.set(siteListLocationKey, siteListLocation);

    // write to the new file
    fs.writeFileSync(siteListLocation, JSON.stringify(this._sites));
  }

  static getVersionFileKeyAndPath(version) {
    const appDataPath = app.getPath('appData');
    return {
      siteListLocationKey: `siteListLocation${version}`,
      siteListLocation: `${appDataPath}/nebula-orion/sites_${version}.json`,
    };
  }

  _onRequestSiteData(ev) {
    ev.sender.send(IPCKeys.ReceiveSiteData, this._sites);
  }
}

module.exports = AppSetup;
