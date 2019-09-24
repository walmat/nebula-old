/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable global-require */
const { app: _app } = require('electron');
const { setUpEnvironment, isDevelopment } = require('./env');

const App = require('./app');

// setup nebula environment
setUpEnvironment();

// reference to our application
const app = new App();

// TODO: Disable this in prod when we find a solution!
_app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

const appLock = _app.requestSingleInstanceLock();

if (!appLock) {
  _app.quit();
} else {
  _app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window instead
    const main = app.windowManager._main;
    if (main) {
      if (main.isMinimized()) main.restore();
      main.focus();
    }
  });

  /**
   * Event fired when IPCRenderer triggers 'ready'
   */
  _app.on('ready', async () => {
    if (isDevelopment()) {
      console.log('Application is ready');
    }
    app.onReady();
  });

  /**
   * Event fired when IPCRenderer triggers 'quit'
   */
  _app.on('quit', () => {
    if (isDevelopment()) {
      console.log('Application is quitting');
    }
  });

  /**
   * Event fired when IPCRenderer triggers 'window-all-closed'
   */
  _app.on('window-all-closed', () => {
    if (isDevelopment()) {
      console.log('All of the window was closed.');
    }

    app.onWindowAllClosed();
  });

  /**
   * Handle certificate error event
   */
  _app.on('certificate-error', app.onCertificateErrorHandler);

  /**
   * Check web contents when they are created
   */
  _app.on('web-contents-created', (evt1, contents) => {
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
}
