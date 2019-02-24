const Electron = require('electron');
const Path = require('path');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

const _defaultWebPreferences = {
  nodeIntegration: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalCanvasFeatures: false,
  experimentalFeatures: false,
  blinkFeatures: '',
};

const _createWindow = options => {
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
      "default-src 'none'; connect-src 'self' https: wss:; font-src 'self' https: https://fonts.gstatic.com data:; script-src 'self' https: 'unsafe-inline' 'unsafe-eval'; frame-src 'self' https:; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; media-src 'self' blob:; manifest-src 'self' data:;",
    ];
    if (nebulaEnv.isDevelopment()) {
      // If in dev mode, allow inline scripts to run (for developer tool extensions)
      cspHeaders = [
        "default-src 'none'; connect-src 'self' https: wss:; font-src 'self' https: https://fonts.gstatic.com data:; script-src 'self' https: 'unsafe-inline' 'unsafe-eval'; frame-src 'self' https:; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; media-src 'self' blob:; manifest-src 'self' data:;",
      ];
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': cspHeaders,
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
  _createWindow({
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
  _createWindow({
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
  _createWindow({
    // assign default background color first, so it can be overwritten by parameter options
    backgroundColor: '#f4f4f4',
    ...options,
    width: 400,
    height: 650,
    transparent: true,
    webPreferences: {
      ..._defaultWebPreferences,
      ...webPreferences,
      webSecurity: false,
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
  _createWindow({
    ...options,
    width: 450,
    height: 475,
    frame: true,
    webPreferences: {
      ..._defaultWebPreferences,
      ...webPreferences,
      preload: Path.join(__dirname, '../common/bridge/youtubePreload.js'),
    },
  });

const youtubeUrl =
  'https://accounts.google.com/signin/v2/identifier?hl=en&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Ffeature%3Dsign_in_button%26hl%3Den%26app%3Ddesktop%26next%3D%252F%26action_handle_signin%3Dtrue&passive=true&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin';
urls.set('youtube', youtubeUrl);

/**
 * Creates an Main Window
 *
 * @return {BrowserWindow} Main Window
 */
const createMainWindow = () =>
  _createWindow({
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
