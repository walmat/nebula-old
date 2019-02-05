/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable global-require */
const Electron = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const nebulaEnv = require('./env');
const App = require('./app');

// setup nebula environment
nebulaEnv.setUpEnvironment();

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'debug';

autoUpdater.on('checking-for-update', e => {
  log.info('CHECKING FOR UPDATE', e);
});

autoUpdater.on('update-available', info => {
  log.info('UPDATE AVAILABLE: ', info);
});

autoUpdater.on('update-not-available', info => {
  log.info('UPDATE NOT AVAILABLE: ', info);
});

autoUpdater.on('error', err => {
  log.info('ERROR: ', err);
});

autoUpdater.on('download-progress', progressObj => {
  log.info('DOWNLOADING: ', progressObj.bytesPerSecond);
});

autoUpdater.on('update-downloaded', info => {
  log.info('UPDATING: ', info);
  Electron.dialog.showMessageBox(
    {
      type: 'info',
      title: 'New Update',
      message: 'New Updated Downloaded, Nebula will restart',
      buttons: ['Ok'],
    },
    () => {
      autoUpdater.quitAndInstall();
    },
  );
});

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

  app.onReady().then(() => {
    log.info('Starting update check...');
    autoUpdater.checkForUpdates();
  });
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
