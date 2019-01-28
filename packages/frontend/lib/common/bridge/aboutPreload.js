const nebulaEnv = require('../../_electron/env');
const { base } = require('./index');

nebulaEnv.setUpEnvironment();

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {
    ...base,
  };
});
