const nebulaEnv = require('../../_electron/env');
const { base, util } = require('./index');

nebulaEnv.setUpEnvironment();

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {
    ...base,
    ...util,
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
