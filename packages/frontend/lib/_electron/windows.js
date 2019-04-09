xconst Electron = require('electron');
const Path = require('path');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

const _defaultWebPreferences = {
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalCanvasFeatures: true,
  experimentalFeatures: false,
  blinkFeatures: '',
};

const _createWindow = (type, options) => {
  // Create options
  const browserWindowOptions = {
    center: true,
    frame: false,
    fullscreenable: false,
    movable: true,
    resizable: false,
    show: false,
    webPreferences: {
      ..._defaultWebPreferences,
    },
    ...options,
  };

  // Create new window instance
  const win = new Electron.BrowserWindow(browserWindowOptions);

  // Attach CSP Header by Default
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // The majority of styling is currently inlne, so we have to allow this!
    // TODO: move away from inline styles!
    let cspHeaders = [
      "default-src 'none'; connect-src 'self' https: wss:; font-src 'self' https: https://fonts.gstatic.com data:; script-src 'self' http://* https://* 'unsafe-inline' 'unsafe-eval'; frame-src 'self' https:; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; media-src 'self' blob:; manifest-src 'self' data:;",
    ];
    if (nebulaEnv.isDevelopment()) {
      // If in dev mode, allow inline scripts to run (for developer tool extensions)
      cspHeaders = [
        "default-src 'none'; connect-src 'self' https: wss:; font-src 'self' https: https://fonts.gstatic.com data:; script-src 'self' http://* https://* 'unsafe-inline' 'unsafe-eval'; frame-src 'self' https:; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; media-src 'self' blob:; manifest-src 'self' data:;",
      ];
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': cspHeaders,
      },
    });
  });

  win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        DNT: 1,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) @nebula/orion/1.0.0-beta.6.1 Chrome/66.0.3359.181 Electron/3.1.4 Safari/537.36',
        'Content-Language': 'en-US,en;q=0.9',
      },
    });
  });

  // Setup Explicit Window Permissions
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (nebulaEnv.isDevelopment()) {
      console.log(`[DEBUG]: Requesting Permission: ${permission}`);
    }
    switch (permission) {
      case 'clipboardRead':
      case 'clipboardWrite':
      case 'contextMenus':
      case 'cookies':
      case 'history':
      case 'idle':
      case 'proxy':
      case 'sessions':
      case 'webRequest': {
        callback(true);
        break;
      }
      case 'certificateProvider':
      case 'debugger':
      case 'displaySource': {
        if (nebulaEnv.isDevelopment()) {
          callback(true);
        } else {
          callback(false);
        }
        break;
      }
      default: {
        callback(false);
      }
    }
  });

  return win;
};

/**
 * Map of our respective urls
 * :: (name, ref)
 */
const urls = new Map();

/**
 * Creates an Auth Window
 *
 * @return {BrowserWindow} Auth Window
 */
const createAuthWindow = () =>
  _createWindow('auth', {
    width: 300,
    height: 215,
    webPreferences: {
      ..._defaultWebPreferences,
      preload: Path.join(__dirname, '../common/bridge/authPreload.js'),
    },
  });

const authUrl = `file:///${Path.join(__dirname, '../../build/auth.html')}`;
urls.set('auth', authUrl);

/**
 * Creates an About Window
 *
 * @return {BrowserWindow} About Window
 */
const createAboutWindow = () =>
  _createWindow('about', {
    width: 300,
    height: 215,
    webPreferences: {
      ..._defaultWebPreferences,
      preload: Path.join(__dirname, '../common/bridge/aboutPreload.js'),
    },
  });

const aboutUrl = `file:///${Path.join(__dirname, '../../build/about.html')}`;
urls.set('about', aboutUrl);

/**
 * Creates an Captcha Window
 *
 * @return {BrowserWindow} Captcha Window
 */
const createCaptchaWindow = (options = {}, webPreferences = {}) =>
  _createWindow('captcha', {
    // assign default background color first, so it can be overwritten by parameter options
    backgroundColor: '#f4f4f4',
    ...options,
    width: 400,
    height: 650,
    transparent: true,
    acceptFirstMouse: true,
    webPreferences: {
      ..._defaultWebPreferences,
      ...webPreferences,
      webSecurity: false,
      webgl: true,
      webaudio: true,
      plugins: true,
      defaultFontFamily: 'sansSerif',
      preload: Path.join(__dirname, '../common/bridge/captchaPreload.js'),
    },
  });

let captchaUrl = `file:///${Path.join(__dirname, '../../build/captcha.html')}`;
if (nebulaEnv.isDevelopment()) {
  captchaUrl = `file:///${Path.join(__dirname, '../../public/captcha.html')}`;
}
urls.set('captcha', captchaUrl);

/**
 * Creates an YouTube Window
 *
 * @return {BrowserWindow} YouTube Window
 */
const createYouTubeWindow = (options = {}, webPreferences = {}) =>
  _createWindow('gmail', {
    ...options,
    width: 650,
    height: 615,
    frame: true,
    resizable: true,
    webPreferences: {
      ..._defaultWebPreferences,
      ...webPreferences,
      webSecurity: false,
      allowRunningInsecureContent: true,
      webgl: true,
      webaudio: true,
      plugins: true,
      defaultFontFamily: 'sansSerif',
      preload: Path.join(__dirname, '../common/bridge/youtubePreload.js'),
    },
  });

const youtubeUrl =
  'https://accounts.google.com/ServiceLogin?service=mail&passive=true&rm=false&continue=https://mail.google.com/mail/&ss=1&scc=1&ltmpl=default&ltmplcache=2&emr=1&osid=1';
urls.set('gmail', youtubeUrl);

/**
 * Creates an Main Window
 *
 * @return {BrowserWindow} Main Window
 */
const createMainWindow = () =>
  _createWindow('main', {
    width: 1000,
    height: 715,
    webPreferences: {
      ..._defaultWebPreferences,
      preload: Path.join(__dirname, '../common/bridge/mainPreload.js'),
    },
  });

const mainUrl =
  process.env.NEBULA_START_URL || `file:///${Path.join(__dirname, '../../build/index.html')}`;
urls.set('main', mainUrl);

module.exports = {
  createAboutWindow,
  createAuthWindow,
  createCaptchaWindow,
  createMainWindow,
  createYouTubeWindow,
  urls,
};
