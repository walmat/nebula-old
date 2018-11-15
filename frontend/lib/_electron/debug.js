const { ipcMain } = require('electron');
const nebulaEnv = require('./env');
const { setLevels } = require('task-runner/common/logger');

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
