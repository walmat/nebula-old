const IPCKeys = require('../constants');
const nebulaEnv = require('../../_electron/env');
const { util, base } = require('./index');

nebulaEnv.setUpEnvironment();

/**
 * Sends the deactivate trigger to authManager.js
 *
 * @param {String} key user's license key (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)
 */
const _authenticate = key => {
  util.sendEvent(IPCKeys.AuthRequestActivate, key);
};

process.once('loaded', () => {
  window.Bridge = window.Bridge || {
    ...base,
    ...util,
    authenticate: _authenticate,
  };

  if (nebulaEnv.isDevelopment()) {
    window.Bridge.sendDebugCmd = (...params) => {
      util.sendEvent('debug', ...params);
    };

    util.handleEvent('debug', (ev, type, ...params) => {
      console.log(`Received Response for type: ${type}`);
      console.log(params);
    });
  }
});
