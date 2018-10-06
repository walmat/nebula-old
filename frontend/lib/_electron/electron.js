const Electron = require('electron');
const nebulaEnv = require('./env');
const App = require('./app');

// reference to our application
const app = new App();

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
