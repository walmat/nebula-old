const IPCKeys = require('../constants');
const nebulaEnv = require('../../_electron/env');
const { _close, _sendEvent, _handleEvent } = require('./index');

nebulaEnv.setUpEnvironment();

/**
 * Sends the deactivate trigger to authManager.js
 *
 * @param {String} key user's license key (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)
 */
const _authenticate = key => {
  _sendEvent(IPCKeys.AuthRequestActivate, key);
};

process.once('loaded', () => {
  window.Bridge = window.Bridge || {};

  window.Bridge.authenticate = _authenticate;
  window.Bridge.close = _close;

  if (nebulaEnv.isDevelopment()) {
    window.Bridge.sendDebugCmd = (...params) => {
      _sendEvent('debug', ...params);
    };

    _handleEvent('debug', (ev, type, ...params) => {
      console.log(`Received Response for type: ${type}`);
      console.log(params);
    });
  }
});
