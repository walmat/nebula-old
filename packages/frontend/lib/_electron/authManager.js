const Store = require('electron-store');
const { random } = require('lodash');
const fetch = require('node-fetch');

const nebulaEnv = require('./env');
const { IPCKeys } = require('../common/constants');

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
    this._authInterval = setInterval(async () => {
      const validUser = await this.checkSession();

      if (!validUser) {
        const windowManager = this._context._windowManager;
        clearInterval(this._authInterval);
        this._authInterval = null;
        await this.removeActiveSession();
        await this.clearSession();
        windowManager._captchaWindowManager.closeAllCaptchaWindows();
        windowManager.transitionToDeauthedState();
      }
      // eslint-disable-next-line no-bitwise
    }, random(3500, 5000));

    /**
     * Application Store
     *
     * @type {Store}
     */
    this._store = new Store();

    const lockify = func => {
      let _lock = false;
      return async (...params) => {
        if (!_lock) {
          _lock = true;
          await func.apply(this, params);
          _lock = false;
        }
      };
    };

    context.ipc.on(IPCKeys.AuthRequestActivate, lockify(this._onAuthRequestActivate));
    context.ipc.on(IPCKeys.AuthRequestDeactivate, lockify(this._onAuthRequestDeactivate));
    context.ipc.on(IPCKeys.AuthRequestStatus, lockify(this._onAuthRequestStatus));
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

  /**
   * Attempts to get the current session of the user
   * @return {Object} valid session or null
   */
  async getSession() {
    if (nebulaEnv.isDevelopment()) {
      return {
        accessToken: 'DEVACCESS',
        refreshToken: 'DEVREFRESH',
        expiry: null,
      };
    }

    let session = this._store.get('session');

    if (session) {
      session = JSON.parse(session);
      if (session.expiry === null || session.expiry > Date.now() / 1000) {
        return session;
      }

      const res = await fetch(`${process.env.NEBULA_API_URL}/auth/token`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh',
          token: session.refreshToken,
        }),
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

  /**
   * Polls every 10-15 seconds to make sure the valid session still holds
   * @return {Boolean} valid user
   */
  async checkSession() {
    if (nebulaEnv.isDevelopment()) {
      return true;
    }

    const session = await this.getSession();

    if (!session) {
      return false;
    }

    try {
      const res = await fetch(`${process.env.NEBULA_API_URL}/auth`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[DEBUG]: CHECKING SESSION STATUS CODE: ', res.status);

      if (!res.ok) {
        const error = new Error('Invalid response!');
        error.status = res.status;
        throw error;
      }
    } catch (error) {
      return false;
    }
    return true;
  }

  async createActiveSession() {
    if (nebulaEnv.isDevelopment()) {
      return true;
    }

    const session = await this.getSession();
    if (session) {
      try {
        const res = await fetch(`${process.env.NEBULA_API_URL}/auth/active`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('[DEBUG]: CREATE ACTIVE SESSION STATUS CODE: ', res.status);
        return true;
      } catch (err) {
        console.log('UNABLE TO SET ACTIVE USER: ', err);
        // fail silently...
      }
    }
    return false;
  }

  async removeActiveSession() {
    if (nebulaEnv.isDevelopment()) {
      return true;
    }

    const session = await this.getSession();
    if (session) {
      try {
        const res = await fetch(`${process.env.NEBULA_API_URL}/auth/active`, {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('[DEBUG]: REMOVE ACTIVE SESSION STATUS CODE: ', res.status);
        return true;
      } catch (err) {
        console.log('UNABLE TO REMOVE ACTIVE USER: ', err);
        // fail silently...
      }
    }
    return false;
  }

  /**
   * Attempts to clear the current session of the user
   * @return {Boolean} valid attempt to clear
   */
  async clearSession() {
    if (nebulaEnv.isDevelopment()) {
      this._store.delete('session');
      return true;
    }
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
      if (!res.ok && res.status !== 403) {
        const { error } = await res.json();
        console.log('[ERROR]: Unable to Delete: ', error);
        return false;
      }
    }
    this._store.delete('session');
    return true;
  }

  /**
   * Attempts to create a session for the user
   * @param {String} key user's license key
   *
   * @return {Object} valid session or errors
   */
  async createSession(key) {
    if (nebulaEnv.isDevelopment()) {
      return {
        accessToken: 'DEVACCESS',
        refreshToken: 'DEVREFRESH',
        expiry: null,
      };
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

  /**
   * IPCMain intercept to validate a user
   * @return {none}
   */
  async _onAuthRequestActivate(_, key) {
    let session = await this.getSession();
    if (!session) {
      session = await this.createSession(key);
    }
    const windowManager = this._context._windowManager;

    if (!session || (session && session.errors)) {
      if (!windowManager._auth) {
        clearInterval(this._authInterval);
        this._authInterval = null;
        await this.clearSession();
        windowManager._captchaWindowManager.closeAllCaptchaWindows();
        windowManager.transitionToDeauthedState();
      }
    } else {
      this._authInterval = setInterval(async () => {
        const validUser = await this.checkSession();

        if (!validUser) {
          clearInterval(this._authInterval);
          this._authInterval = null;
          await this.clearSession();
          windowManager._captchaWindowManager.closeAllCaptchaWindows();
          windowManager.transitionToDeauthedState();
        }
      }, random(3500, 5000));
      await this.createActiveSession();
      windowManager.transitiontoAuthedState();
    }
  }

  /**
   * IPCMain intercept to invalidate a user
   * @return {none}
   */
  async _onAuthRequestDeactivate(ev) {
    await this.removeActiveSession();
    const deactivated = await this.clearSession();
    if (!deactivated) {
      ev.sender.send('error', 'Unable to invalidate');
      return;
    }
    this._context._windowManager.transitionToDeauthedState();
  }

  /**
   * IPCRenderer intercept to get validation status of user
   * @return {none}
   */
  async _onAuthRequestStatus() {
    return !!(await this.getSession());
  }
}

module.exports = AuthManager;
