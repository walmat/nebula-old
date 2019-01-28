// eslint-disable-next-line import/no-extraneous-dependencies
const { remote } = require('electron');

const IPCKeys = require('../constants');
const nebulaEnv = require('../../_electron/env');
const { base, util } = require('./index');

nebulaEnv.setUpEnvironment();

/**
 * Sends the launch youtube window trigger to windowManager.js
 */
const _launchYoutube = () => {
  util.sendEvent(IPCKeys.RequestLaunchYoutube);
};

/**
 * Sends the end session trigger to windowManager.js
 */
const _endCaptchaSession = () => {
  const { id } = remote.getCurrentWindow();
  util.sendEvent(IPCKeys.RequestEndSession, id);
};

/**
 * Sends the harvest captcha trigger to windowManager.js
 */
const _harvestCaptchaToken = (runnerId, token, siteKey) => {
  util.sendEvent(IPCKeys.HarvestCaptcha, runnerId, token, siteKey);
};

const _registerForStartHarvestCaptcha = callback => {
  util.handleEvent(IPCKeys.StartHarvestCaptcha, callback);
};

const _deregisterForStartHarvestCaptcha = callback => {
  util.removeEvent(IPCKeys.StartHarvestCaptcha, callback);
};

const _registerForStopHarvestCaptcha = callback => {
  util.handleEvent(IPCKeys.StopHarvestCaptcha, callback);
};

const _deregisterForStopHarvestCaptcha = callback => {
  util.removeEvent(IPCKeys.StopHarvestCaptcha, callback);
};

/**
 * Sends the refresh window trigger to windowManager.js
 */
const _refreshCaptchaWindow = () => {
  util.sendEvent(IPCKeys.RequestRefresh);
};

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {
    ...base,
    ...util,
    /* PRIVATE EVENTS */
    launchYoutube: _launchYoutube,
    refreshCaptchaWindow: _refreshCaptchaWindow,
    harvestCaptchaToken: _harvestCaptchaToken,
    Captcha: {
      start: {
        register: _registerForStartHarvestCaptcha,
        deregister: _deregisterForStartHarvestCaptcha,
      },
      stop: {
        register: _registerForStopHarvestCaptcha,
        deregister: _deregisterForStopHarvestCaptcha,
      },
    },
    endCaptchaSession: _endCaptchaSession,
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
