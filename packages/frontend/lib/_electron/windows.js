// eslint-disable-next-line import/no-extraneous-dependencies
const Electron = require('electron');
const Path = require('path');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

const _defaultWebPreferences = {
  backgroundThrottling: false,
  nodeIntegration: false,
  contextIsolation: false,
  nodeIntegrationInWorker: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalCanvasFeatures: true,
  experimentalFeatures: false,
  blinkFeatures: '',
};

const _createWindow = options => {
  // Create options
  const browserWindowOptions = {
    center: true,
    frame: false,
    transparent: false,
    fullscreenable: false,
    resizable: false,
    movable: true,
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
      "default-src 'none'; connect-src 'self' https: wss:; child-src 'self' blob:; font-src 'self' https: https://fonts.gstatic.com data:; script-src 'self' http://* https://* 'unsafe-inline' 'unsafe-eval' blob:; frame-src 'self' https:; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; media-src 'self' blob:; manifest-src 'self' data:; worker-src blob: https:;",
    ];
    if (nebulaEnv.isDevelopment()) {
      // If in dev mode, allow inline scripts to run (for developer tool extensions)
      cspHeaders = [
        "default-src 'none'; connect-src 'self' https: wss:; child-src 'self' blob:; font-src 'self' https: https://fonts.gstatic.com data:; script-src 'self' http://* https://* 'unsafe-inline' 'unsafe-eval' blob:; frame-src 'self' https:; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; media-src 'self' blob:; manifest-src 'self' data:; worker-src blob: https:;",
      ];
    }
    callback({
      ...details,
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': cspHeaders,
      },
    });
  });

  win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = new URL(details.url);
    const { host, origin } = url;

    callback({
      cancel: false,
      ...details,
      requestHeaders: {
        ...details.requestHeaders,
        host,
        origin,
        DNT: 1,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
      },
    });
  });

  win.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.google.com, https://*.gstatic.com'] },
    (details, callback) =>
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          DNT: 1,
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
          'Content-Language': 'en-US,en;q=0.9',
        },
      }),
  );

  win.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.amazonaws.com'] },
    (details, callback) =>
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          DNT: 1,
          origin: 'http://localhost:3000',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
          'Content-Language': 'en-US,en;q=0.9',
        },
      }),
  );

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
        callback(true);
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
    width: 600,
    height: 430,
    transparent: true,
    frame: false,
    webPreferences: {
      ..._defaultWebPreferences,
      preload: Path.join(__dirname, '../common/bridge/authPreload.js'),
    },
  });

let authUrl = `file:///${Path.join(__dirname, '../../build/auth.html')}`;
if (nebulaEnv.isDevelopment()) {
  authUrl = `file:///${Path.join(__dirname, '../../public/auth.html')}`;
}
urls.set('auth', authUrl);

const createSplashWindow = () =>
  _createWindow({
    width: 450,
    height: 350,
    show: true,
    frame: false,
    transparent: true,
  });

let splashUrl = `file:///${Path.join(__dirname, '../../build/splash.html')}`;
if (nebulaEnv.isDevelopment()) {
  splashUrl = `file:///${Path.join(__dirname, '../../public/splash.html')}`;
}
urls.set('splash', splashUrl);

/**
 * Creates an About Window
 *
 * @return {BrowserWindow} About Window
 */
const createAboutWindow = () =>
  _createWindow({
    width: 300,
    height: 215,
    transparent: true,
    frame: false,
    webPreferences: {
      ..._defaultWebPreferences,
      preload: Path.join(__dirname, '../common/bridge/aboutPreload.js'),
    },
  });

let aboutUrl = `file:///${Path.join(__dirname, '../../build/about.html')}`;
if (nebulaEnv.isDevelopment()) {
  aboutUrl = `file:///${Path.join(__dirname, '../../public/about.html')}`;
}
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
    resizable: false,
    fullscreenable: false,
    transparent: true,
    frame: false,
    acceptFirstMouse: true,
    webPreferences: {
      ..._defaultWebPreferences,
      ...webPreferences,
      webSecurity: false,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      nodeIntegrationInSubFrames: true,
      allowRunningInsecureContent: true,
      webgl: true,
      webaudio: true,
      plugins: true,
      preload: Path.join(__dirname, '../common/bridge/captchaPreload.js'),
    },
  });

let captchaUrl = `${Path.join(__dirname, '../../build/captcha.html')}`;
if (nebulaEnv.isDevelopment()) {
  captchaUrl = `${Path.join(__dirname, '../../public/captcha.html')}`;
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
    width: 650,
    height: 615,
    frame: true,
    resizable: true,
    webPreferences: {
      ..._defaultWebPreferences,
      ...webPreferences,
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: true,
      webgl: true,
      webaudio: true,
      plugins: true,
    },
  });

const youtubeUrl =
  'https://accounts.google.com/signin/v2/identifier?hl=en&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Ffeature%3Dsign_in_button%26hl%3Den%26app%3Ddesktop%26next%3D%252F%26action_handle_signin%3Dtrue&passive=true&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin';
urls.set('gmail', youtubeUrl);

/**
 * Creates an Main Window
 *
 * @return {BrowserWindow} Main Window
 */
const createMainWindow = () =>
  _createWindow({
    width: 1020,
    height: 715,
    resizable: true,
    transparent: true,
    frame: false,
    minWidth: 1020,
    minHeight: 715,
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
  createSplashWindow,
  createAuthWindow,
  createCaptchaWindow,
  createMainWindow,
  createYouTubeWindow,
  urls,
};
