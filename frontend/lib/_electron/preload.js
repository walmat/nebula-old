const { remote } = require('electron');
const { dialog } = require('electron').remote;
const { ipcRenderer, webFrame } = require('electron');
const IPCKeys = require('../common/Constants');
const nebulaEnv = require('../_electron/env');

// setup environment
nebulaEnv.setUpEnvironment();

// disable zoom
webFrame.setVisualZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);

/**
 * Sends IPCMain an event trigger
 * @param {String} channel definition for which trigger to look for
 * @param {*} msg any object to send along with the event
 */
const _sendEvent = (channel, msg) => {
  ipcRenderer.send(channel, msg);
};

/**
 * Sends the deactivate trigger to authManager.js
 */
const _deactivate = () => {
  _sendEvent(IPCKeys.AuthRequestDeactivate);
};

/**
 * Sends the deactivate trigger to authManager.js
 *
 * @param {String} key user's license key (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)
 */
const _authenticate = (key) => {
  _sendEvent(IPCKeys.AuthRequestActivate, key);
};

/**
 * Sends the close window trigger to windowManager.js
 */
const _close = () => {
  const { id } = remote.getCurrentWindow();
  _sendEvent(IPCKeys.RequestCloseWindow, id);
};

/**
 * Sends the launch youtube window trigger to windowManager.js
 */
const _launchYoutube = () => {
  _sendEvent(IPCKeys.RequestCreateNewWindow, 'youtube');
};

/**
 * Sends the launch captcha window trigger to windowManager.js
 */
const _launchHarvester = () => {
  _sendEvent(IPCKeys.RequestCreateNewWindow, 'captcha');
};

/**
 * Sends the end session trigger to windowManager.js
 */
const _endSession = () => {
  _sendEvent(IPCKeys.RequestEndSession);
};

/**
 * Sends the harvest captcha trigger to windowManager.js
 */
const _harvest = (token) => {
  _sendEvent(IPCKeys.HarvestCaptcha, token);
};

/**
 * Sends the refresh window trigger to windowManager.js
 */
const _refresh = (window) => {
  _sendEvent(IPCKeys.RequestRefresh, window);
};

/**
 * ... TODO!
 * Sends the confirmation dialog trigger to windowManager.js
 */
const _confirmDialog = async message =>
  new Promise((resolve) => {
    dialog.showMessageBox({
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Confirm',
      message,
    }, response => resolve(response === 0));
  });

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {};
  /* BRIDGED EVENTS */
  window.Bridge.launchYoutube = _launchYoutube;
  window.Bridge.launchHarvester = _launchHarvester;
  window.Bridge.close = _close;
  window.Bridge.refresh = _refresh;
  window.Bridge.harvest = _harvest;
  window.Bridge.endSession = _endSession;
  window.Bridge.deactivate = _deactivate;
  window.Bridge.authenticate = _authenticate;
  window.Bridge.confirmDialog = _confirmDialog;
  if (nebulaEnv.isDevelopment()) {
    window.Bridge.sendDebugCmd = (evt) => {
      _sendEvent('debug', evt);
    };
  }
});
