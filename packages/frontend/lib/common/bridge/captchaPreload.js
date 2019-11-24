// eslint-disable-next-line import/no-extraneous-dependencies
const { remote } = require('electron');

const { IPCKeys } = require('../constants');
const nebulaEnv = require('../../_electron/env');
const { base, util } = require('./index');

nebulaEnv.setUpEnvironment();

const _saveProxyForCaptchaWindow = proxy => {
  const { id } = remote.getCurrentWindow();
  util.sendEvent(IPCKeys.RequestSaveCaptchaProxy, id, proxy);
};

/**
 * Sends the launch youtube window trigger to windowManager.js
 */
const _launchYoutube = () => {
  util.sendEvent(IPCKeys.RequestLaunchYoutube);
};

/**
 * Gets the current window position
 */
const _getPosition = () => {
  const win = remote.getCurrentWindow();
  return win.getPosition();
};

const _registerForShowProxy = cb => {
  util.sendEvent(IPCKeys.RequestShowProxy, cb);
};

const _deregisterForShowProxy = cb => {
  util.removeEvent(IPCKeys.RequestShowProxy, cb);
};

/**
 * Registers a callback when Change theme event is sent
 */
const _registerForThemeChange = callback => {
  util.handleEvent(IPCKeys.ChangeTheme, callback);
};

/**
 * deregisters a callback for the Change theme
 */
const _deregisterForThemeChange = callback => {
  util.removeEvent(IPCKeys.ChangeTheme, callback);
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
const _harvestCaptchaToken = (id, token, siteKey, host) => {
  util.sendEvent(IPCKeys.HarvestCaptcha, id, token, siteKey, host);
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
    /* PRIVATE EVENTS */
    launchYoutube: _launchYoutube,
    refreshCaptchaWindow: _refreshCaptchaWindow,
    harvestCaptchaToken: _harvestCaptchaToken,
    saveProxyForCaptchaWindow: _saveProxyForCaptchaWindow,
    Captcha: {
      start: {
        register: _registerForStartHarvestCaptcha,
        deregister: _deregisterForStartHarvestCaptcha,
      },
      stop: {
        register: _registerForStopHarvestCaptcha,
        deregister: _deregisterForStopHarvestCaptcha,
      },
      proxy: {
        register: _registerForShowProxy,
        deregister: _deregisterForShowProxy,
      },
      getPosition: _getPosition,
    },
    endCaptchaSession: _endCaptchaSession,
    Theme: {
      change: {
        register: _registerForThemeChange,
        deregister: _deregisterForThemeChange,
      },
    },
  };
});
