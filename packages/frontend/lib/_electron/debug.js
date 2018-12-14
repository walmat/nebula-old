const { ipcMain } = require('electron');
const { setLevels } = require('@nebula/task-runner/src/common/logger');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

module.exports = {};

module.exports.bindDebugEvents = function bindDebugEvents(context) {
  if (nebulaEnv.isDevelopment()) {
    ipcMain.on('debug', (event, type, ...params) => {
      switch (type) {
        case 'clearStore': {
          context.authManager.store.clear();
          break;
        }
        case 'setLogLevel': {
          const [levels, name, ...other] = params;
          console.log(`DEBUG: setting levels to: ${levels} ${name ? `for Logger: ${name}` : ''}`);
          setLevels(levels, name);
          break;
        }
        default: break;
      }
    });
  }
};
