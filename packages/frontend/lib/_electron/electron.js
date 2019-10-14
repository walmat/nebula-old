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
    _app.setAppUserModelId('com.nebula.orion');
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
}
