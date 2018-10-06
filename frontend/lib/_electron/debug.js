const { ipcMain } = require('electron');
const nebulaEnv = require('./env');
const nebulaAuth = require('./authManager');

nebulaEnv.setUpEnvironment();

module.exports.bindDebugEvents = function bindDebugEvents() {
  if (nebulaEnv.isDevelopment()) {
    ipcMain.on('debug', (event) => {
      switch (event) {
        case 'clearStore': {
          nebulaAuth.store.clear();
          break;
        }
        default: break;
      }
    });
  }
};
