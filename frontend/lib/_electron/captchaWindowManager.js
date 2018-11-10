const IPCKeys = require('../common/constants');
const moment = require('moment');
const _ = require('underscore');

const TokenContainer = require('../common/classes/tokenContainer');

class CaptchaWindowManager {
  constructor(context, captchaWindow, session) {
    /**
     * Application context
     */
    this._context = context;

    /**
     * Main window reference
     */
    this._main = this._context._windowManager._main;

    /**
     * Captcha window that the manager takes care of
     */
    this._captchaWindow = captchaWindow;

    /**
     * Window Manager reference
     */
    this._windowManager = this._context._windowManager;

    /**
     * YouTube window that the manager takes care of
     */
    this._youtubeWindow = null;

    /**
     * All harvested tokens for this window
     */
    this._tokens = [];

    /**
     * Session that the captcha window will use / YouTube window will set
     */
    this._session = session;

    /**
     * IPC Function Definitions
     */
    context.ipc.on(IPCKeys.RequestLaunchYoutube, this._onRequestLaunchYoutube.bind(this));
    context.ipc.on(IPCKeys.RequestEndSession, this._onRequestEndSession.bind(this));
    context.ipc.on(IPCKeys.HarvestCaptcha, this._onRequestHarvestToken.bind(this));
    context.ipc.on(
      IPCKeys.RequestRefreshCaptchaWindow,
      this._onRequestRefreshCaptchaWindow.bind(this),
    );

    /**
    * Constantly check for expired tokens every second
    */
    this._checkTokens = setInterval(this.checkTokens, 1000);
  }

  /**
   * Check harvested captcha tokens to see if they're expired or not
   */
  checkTokens() {
    if (this._tokens && this._tokens.length > 0) {
      this._tokens.forEach((token) => {
        token.setTimestamp(110 - moment().diff(moment(token.timestamp, 'seconds')));
        if (this.isTokenExpired(token)) {
          this.removeExpiredToken(token);
        }
      });
    } else {
      // don't run the interval check if no tokens are present
      clearInterval(this._checkTokens);
      this._checkTokens = null;
    }
  }

  static isTokenExpired(token) {
    // if token has existed for > 110 seconds
    if (moment().diff(moment(token.timestamp), 'seconds') > 110) {
      return true;
    } return false;
  }

  /**
   * Get the current session
   */
  getSession() {
    return this._session;
  }

  /**
   * Sets the session
   * @param {Object} session - session object to use
   */
  setSession(session) {
    this._session = session;
  }

  /**
   * See what the proxy is for the given url
   * @param {String} url - urk to ping
   */
  resolveProxy(url) {
    return this._session.resolveProxy(url, proxy => proxy);
  }

  /**
   * Sets the proxy for the window's session
   *
   * @param {String} proxy proxyRules = schemeProxies[";"<schemeProxies>]
                           schemeProxies = [<urlScheme>"="]<proxyURIList>
                           urlScheme = "http" | "https" | "ftp" | "socks"
                           proxyURIList = <proxyURL>[","<proxyURIList>]
                           proxyURL = [<proxyScheme>"://"]<proxyHost>[":"<proxyPort>]
   *
   *
   */
  setProxy(proxy) {
    this._session.setProxy({
      pacScript: null,
      proxyRules: proxy,
      proxyBypassRules: null,
    }, () => {
      const p = this.resolveProxy('https://www.google.com/');
      console.log(`Using proxy: ${p}`);
    });
  }

  /**
   * Sets the 'User-Agent' header for the session
   * @param {String} userAgent - user agent to set on all headers
   * @param {String} acceptLanguages - the incoming languages to accept from the response (optional)
   *                                   should be a comma separated list: "en-US,fr,de,ko,zh-CN,ja"
   */
  setUserAgent(userAgent, acceptLanguages) {
    this._session.setUserAgent(userAgent, acceptLanguages);
  }

  /**
   * Gets the 'User-Agent' header for the session
   */
  getUserAgent() {
    return this._session.getUserAgent();
  }

  removeExpiredToken(token) {
    this._tokens = _.reject(this._tokens, el => el.token === token);
  }

  startHarvestingCaptcha(runnerId, siteKey) {
    this._captchaWindow.webContents.send(IPCKeys.StartHarvestCaptcha, runnerId, siteKey);
  }

  stopHarvestingCaptcha(runnerId, siteKey) {
    this._captchaWindow.webContents.send(IPCKeys.StopHarvestCaptcha, runnerId, siteKey);
  }

  /**
   * Clears the storage data and cache for the session
   */
  _onRequestEndSession() {
    this._session.flushStorageData();
    this._session.clearStorageData([], () => {});
    this._session.clearCache(() => {});
  }

  _onRequestHarvestToken(ev, runnerId, token, sitekey, host) {
    this._tokens.push(new TokenContainer(token, moment(), host, sitekey));
    if (this._checkTokens === null) {
      this._checkTokens = setInterval(this.checkTokens, 1000);
    }
  }

  /**
   * Refresh window object
  */
  _onRequestRefreshCaptchaWindow() {
    this._captchaWindow.reload();
  }

  async _onRequestLaunchYoutube() {
    if (this._youtubeWindow === null) {
      const w = await this._windowManager.createNewWindow('youtube');
      this._youtubeWindow = w;
    } else {
      this._youtubeWindow.show();
    }
  }
}
module.exports = CaptchaWindowManager;
