const nebulaEnv = require('../../_electron/env');
const { _close, _sendEvent, _handleEvent, _getAppData } = require('./index');

nebulaEnv.setUpEnvironment();

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {};
  /* BRIDGED EVENTS */
  window.Bridge.close = _close;
  window.Bridge.getAppData = _getAppData;

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
