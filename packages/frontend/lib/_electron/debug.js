// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcMain } = require('electron');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

let setLevels;
if (nebulaEnv.isDevelopment()) {
  ({ setLevels } = require('@nebula/task'));
} else {
  ({ setLevels } = require('@nebula/task-built'));
}

module.exports = {};

module.exports.bindDebugEvents = function bindDebugEvents(context) {
  if (nebulaEnv.isDevelopment()) {
    ipcMain.on('debug', (_, type, ...params) => {
      switch (type) {
        case 'clearStore': {
          context.authManager.store.clear();
          break;
        }
        case 'setLogLevel': {
          const [levels, name] = params;
          console.log(`DEBUG: setting levels to: ${levels} ${name ? `for Logger: ${name}` : ''}`);
          setLevels(levels, name);
          break;
        }
        default:
          break;
      }
    });
  }
};
