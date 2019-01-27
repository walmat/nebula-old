// eslint-disable-next-line import/no-extraneous-dependencies
const { remote } = require('electron');

const IPCKeys = require('../constants');
const nebulaEnv = require('../../_electron/env');
const { _close, _sendEvent, _handleEvent, _removeEvent } = require('./index');

nebulaEnv.setUpEnvironment();

/**
 * Sends the launch youtube window trigger to windowManager.js
 */
const _launchYoutube = () => {
  _sendEvent(IPCKeys.RequestLaunchYoutube);
};

/**
 * Sends the end session trigger to windowManager.js
 */
const _endCaptchaSession = () => {
  const { id } = remote.getCurrentWindow();
  _sendEvent(IPCKeys.RequestEndSession, id);
};

/**
 * Sends the harvest captcha trigger to windowManager.js
 */
const _harvestCaptchaToken = (runnerId, token, siteKey) => {
  _sendEvent(IPCKeys.HarvestCaptcha, runnerId, token, siteKey);
};

const _registerForStartHarvestCaptcha = callback => {
  _handleEvent(IPCKeys.StartHarvestCaptcha, callback);
};

const _deregisterForStartHarvestCaptcha = callback => {
  _removeEvent(IPCKeys.StartHarvestCaptcha, callback);
};

const _registerForStopHarvestCaptcha = callback => {
  _handleEvent(IPCKeys.StopHarvestCaptcha, callback);
};

const _deregisterForStopHarvestCaptcha = callback => {
  _removeEvent(IPCKeys.StopHarvestCaptcha, callback);
};

/**
 * Sends the refresh window trigger to windowManager.js
 */
const _refreshCaptchaWindow = () => {
  _sendEvent(IPCKeys.RequestRefresh);
};

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {};
  /* BRIDGED EVENTS */
  window.Bridge.launchYoutube = _launchYoutube;
  window.Bridge.close = _close;
  window.Bridge.refreshCaptchaWindow = _refreshCaptchaWindow;
  window.Bridge.harvestCaptchaToken = _harvestCaptchaToken;
  window.Bridge.Captcha = {
    start: {
      register: _registerForStartHarvestCaptcha,
      deregister: _deregisterForStartHarvestCaptcha,
    },
    stop: {
      register: _registerForStopHarvestCaptcha,
      deregister: _deregisterForStopHarvestCaptcha,
    },
  };
  window.Bridge.endCaptchaSession = _endCaptchaSession;

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
