/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable global-require */
const Electron = require('electron');
const nebulaEnv = require('./env');
const App = require('./app');

// setup nebula environment
nebulaEnv.setUpEnvironment();

// reference to our application
const app = new App();

// Allow insecure content if in dev mode
// if (nebulaEnv.isDevelopment()) {
//   Electron.app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
// }
// TEMPORARY - Allow insecure content to load the captcha page
// TODO: Disable this in prod when we find a solution!
Electron.app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

/**
 * Event fired when IPCRenderer triggers 'ready'
 */
Electron.app.on('ready', () => {
  if (nebulaEnv.isDevelopment()) {
    console.log('Application is ready');
  }

  app.onReady();
});

/**
 * Event fired when IPCRenderer triggers 'quit'
 */
Electron.app.on('quit', () => {
  if (nebulaEnv.isDevelopment()) {
    console.log('Application is quitting');
  }
});

/**
 * Event fired when IPCRenderer triggers 'window-all-closed'
 */
Electron.app.on('window-all-closed', () => {
  if (nebulaEnv.isDevelopment()) {
    console.log('All of the window was closed.');
  }

  app.onWindowAllClosed();
});

/**
 * Handle certificate error event
 */
Electron.app.on('certificate-error', app.onCertificateErrorHandler);

/**
 * Check web contents when they are created
 */
Electron.app.on('web-contents-created', (evt1, contents) => {
  /**
   * Ensure webview options are valid before creation
   */
  contents.on('will-attach-webview', (evt2, webPreferences, params) => {
    /* eslint no-param-reassign: ["error", { "props": false }] */
    webPreferences.nodeIntegration = false;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.experimentalCanvasFeatures = false;
    webPreferences.experimentalFeatures = false;
    webPreferences.blinkFeatures = '';

    if (
      !params.src.startsWith('file:///') &&
      !params.src.startsWith('https://localhost') &&
      !params.src.startsWith('https://accounts.google.com')
    ) {
      evt2.preventDefault();
    }
  });

  contents.on('will-navigate', (evt2, navigationUrl) => {
    if (
      !navigationUrl.startsWith('file:///') &&
      !navigationUrl.startsWith('https://localhost') &&
      !navigationUrl.startsWith('https://accounts.google.com')
    ) {
      evt2.preventDefault();
    }
  });
});
