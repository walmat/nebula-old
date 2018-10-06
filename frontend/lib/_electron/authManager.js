const Store = require('electron-store');
const fetch = require('node-fetch');

const nebulaEnv = require('./env');
const IPCKeys = require('../common/constants');
const nebulaCheckUpdates = require('./checkUpdates');

// Set up nebula environment variables
nebulaEnv.setUpEnvironment();

class AuthManager {
  /**
   * Initialize auth manager
   *
   * @param {App} context Application context
   */
  constructor(context) {
    this._context = context;

    /**
     * Application Store
     *
     * @type {Store}
     */
    this._store = new Store();

    context.ipc.on(IPCKeys.AuthRequestActivate, this._onAuthRequestActivate.bind(this));
    context.ipc.on(IPCKeys.AuthRequestDeactivate, this._onAuthRequestDeactivate.bind(this));
    context.ipc.on(IPCKeys.AuthRequestStatus, this._onAuthRequestStatus.bind(this));
  }

  /**
   * Get the Store.
   * @return {Store} Electron Store.
   */
  get Store() {
    if (nebulaEnv.isDevelopment()) {
      return this._store;
    }
    return null;
  }

  async getSession() {
    if (nebulaEnv.isDevelopment()) {
      return { accessToken: 'DEVACCESS', refreshToken: 'DEVREFRESH', expiry: null };
    }

    let session = this._store.get('session');

    if (session) {
      session = JSON.parse(session);
      if (session.expiry === null || session.expiry > (Date.now() / 1000)) {
        return session;
      }

      const res = await fetch(`${process.env.NEBULA_API_URL}/auth/token`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grant_type: 'refresh', token: session.refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        const { accessToken, refreshToken, expiry } = data;
        this._store.set('session', JSON.stringify({ accessToken, refreshToken, expiry }));
        return { accessToken, refreshToken, expiry };
      }
      const { error } = await res.json();
      console.log('[ERROR] Unable to perform refresh: ', error);
      return null;
    }
    return null;
  }

  async clearSession() {
    const session = await this.getSession();
    if (session) {
      const res = await fetch(`${process.env.NEBULA_API_URL}/auth`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const { error } = await res.json();
        console.log('[ERROR]: Unable to Delete: ', error);
        return false;
      }
    }
    this._store.delete('session');
    return true;
  }

  async createSession(key) {
    if (nebulaEnv.isDevelopment()) {
      return { accessToken: 'DEVACCESS', refreshToken: 'DEVREFRESH', expiry: null };
    }
    const session = await this.getSession();
    if (session) {
      return session;
    }

    const res = await fetch(`${process.env.NEBULA_API_URL}/auth/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grant_type: 'key', key }),
    });
    if (res.ok) {
      const data = await res.json();
      const { accessToken, refreshToken, expiry } = data;
      this._store.set('session', JSON.stringify({ accessToken, refreshToken, expiry }));

      return { accessToken, refreshToken, expiry };
    }
    const body = await res.json();
    console.log('[ERROR]: Unable to create auth token: ', body);
    return { errors: body.error };
  }

  async _onAuthRequestActivate(event, key) {
    let session = await this.getSession();
    if (!session) {
      session = await this.createSession(key);
    }
    const windowManager = this._context._windowManager;

    if (!session || (session && session.errors)) {
      if (!windowManager._auth) {
        windowManager.transitionToDeauthedState();
      }
    } else {
      const win = windowManager.transitiontoAuthedState();
      nebulaCheckUpdates.checkForUpdates(win);
    }
  }

  async _onAuthRequestDeactivate(ev) {
    const deactivated = await this.clearSession();
    if (!deactivated) {
      ev.sender.send('error', 'Unable to invalidate');
      return;
    }
    this._context._windowManager.transitionToDeauthedState();
  }

  async _onAuthRequestStatus() {
    return !!(await this.getSession());
  }
}

module.exports = AuthManager;