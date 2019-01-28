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
    /* PRIVATE EVENTS */
    authenticate: _authenticate,
  };
});
