const { ipcMain } = require('electron');
const nebulaEnv = require('./env');
const nebulaAuth = require('./auth');

nebulaEnv.setUpEnvironment();

module.exports.bindDebugEvents = function bindDebugEvents() {
  if (process.env.NEBULA_ENV === 'development') {
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
