const Electron = require('electron');
const nebulaEnv = require('./env');
const App = require('./app');

const app = new App();
Electron.app.on('ready', () => {
  if (nebulaEnv.isDevelopment()) {
    console.log('Application is ready');
  }

  app.onReady();
});

Electron.app.on('quit', () => {
  if (nebulaEnv.isDevelopment()) {
    console.log('Application is quitting');
  }
});

Electron.app.on('window-all-closed', () => {
  if (nebulaEnv.isDevelopment()) {
    console.log('All of the window was closed.');
  }

  app.onWindowAllClosed();
});
