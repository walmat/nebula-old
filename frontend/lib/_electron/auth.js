const Store = require('electron-store');
const fetch = require('node-fetch');

const nebulaEnv = require('./env');

// Set up nebula environment variables
nebulaEnv.setUpEnvironment();
const _isDevelopment = process.env.NEBULA_ENV === 'development';


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

    if (_isDevelopment) {
      module.exports.store = this._store;
    }
  }

  static async getSession() {
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

  static async clearSession() {
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

  static async createSession(key) {
    if (_isDevelopment) {
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

// Clear session from store
async function clearSession() {
  const session = await getSession();
  if (session && process.env.NEBULA_ENV !== 'development') {
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
    const body = await res.json();
    console.log('[ERROR]: Unable to create auth token: ', body);
    return { errors: body.error };
  }
}

module.exports.createSession = AuthManager;
