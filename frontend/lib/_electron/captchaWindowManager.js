const Electron = require('electron');
const IPCKeys = require('../common/constants');
const nebulaEnv = require('./env');
const moment = require('moment');

const Token = require('../common/token');

class CaptchaWindowManager {
  constructor(context, main) {
    /**
     * Application context
     */
    this._context = context;

    /**
     * Main window reference
     */
    this._main = main;

    /**
    * Captcha window that the manager takes care of
    */
    this._captchaWindow = null;

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
    this._session = this._context._session.fromPartition();

    /**
     * IPC Listeners
     */
    context.ipc.on(IPCKeys.RequestEndSession, this._onRequestEndSession.bind(this));
    context.ipc.on(IPCKeys.RequestCloseWindow, this._onRequestWindowClose.bind(this));
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

  isTokenExpired(token) {
    // if token has existed for > 110 seconds
    if (moment().diff(moment(token.timestamp), 'seconds') > 110) {
        return true;
    } return false;
  }

  removeExpiredToken(token) {
    this._tokens = _.reject(this._tokens, (el) => {
        return el.token === token;
    });
  }

  /**
   * Clears the storage data and cache for the session
   */
  _onRequestEndSession() {
    this._session.flushStorageData();
    this._session.clearStorageData([], () => {});
    this._session.clearCache(() => {});
  }

  _onRequestHavestToken(ev, token, host, sitekey) {
    this._tokens.push(new Token(token, moment(), host, sitekey));
  }

  /**
  * Constantly check for expired tokens every second
  */
  setInterval(
    () => {
      this._tokens.forEach(token => {
        token.setTimestamp(110 - moment().diff(moment(token.getTimestamp(), 'seconds')));

        if (isTokenExpired(token)) {
            removeExpiredToken(token);
        }
      });
    }, 1000);

  /**
     * Refresh window object
     */
  _onRequestRefreshCaptchaWindow() {
    this._captchaWindow.reload();
  }
}
module.exports = CaptchaWindowManager;
