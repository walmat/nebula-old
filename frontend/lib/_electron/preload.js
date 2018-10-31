const { remote } = require('electron');
const { dialog, app } = require('electron').remote;
const { ipcRenderer, webFrame } = require('electron');
const IPCKeys = require('../common/constants');
const nebulaEnv = require('../_electron/env');

// setup environment
nebulaEnv.setUpEnvironment();

// disable zoom
webFrame.setVisualZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);

/**
 * Sends IPCMain an event trigger
 * @param {String} channel definition for which trigger to look for
 * @param {*} msg any object to send along with the event || null
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
 * Prevent dragover events globally
 */
window.addEventListener('dragover', (event) => {
  event.preventDefault();
  return false;
}, false);

/**
 * Prevent drop events globally
 */
window.addEventListener('drop', (event) => {
  event.preventDefault();
  return false;
}, false);

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

const _closeAllCaptchaWindows = () => {
  _sendEvent(IPCKeys.RequestCloseAllCaptchaWindows);
};

/**
 * Sends the launch youtube window trigger to windowManager.js
 */
const _launchYoutube = () => {
  _sendEvent(IPCKeys.RequestLaunchYoutube);
};

/**
 * Sends the launch captcha window trigger to windowManager.js
 */
const _launchCaptchaHarvester = () => {
  _sendEvent(IPCKeys.RequestCreateNewWindow, 'captcha');
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
const _harvestCaptchaToken = (token) => {
  _sendEvent(IPCKeys.HarvestCaptcha, token);
};

/**
 * Sends the refresh window trigger to windowManager.js
 */
const _refreshCaptchaWindow = () => {
  _sendEvent(IPCKeys.RequestRefresh);
};

/**
 * Send app name/version to the renderer
 */
const _getAppData = () => ({ name: app.getName(), version: app.getVersion() });

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
 * Sends a listener for task events to taskManagerWrapper.js
 */
const _registerForTaskEvents = (handler) => {
  _sendEvent(IPCKeys.RequestRegisterTaskEventHandler, handler);
};

/**
 * Removes a listener for task events to taskManagerWrapper.js
 */
const _deregisterForTaskEvents = (handler) => {
  _sendEvent(IPCKeys.RequestDeregisterTaskEventHandler, handler);
};

/**
 * Sends task(s) that should be started to taskManagerWrapper.js
 */
const _startTasks = (tasks) => {
  _sendEvent(IPCKeys.RequestStartTasks, tasks);
};

/**
 * Sends task(s) that should be stopped to taskManagerWrapper.js
 */
const _stopTasks = (tasks) => {
  _sendEvent(IPCKeys.RequestStopTasks, tasks);
};

/**
 * Sends proxies(s) that should be add to taskManagerWrapper.js
 */
const _addProxies = (proxies) => {
  _sendEvent(IPCKeys.RequestAddProxies, proxies);
};

/**
 * Sends task(s) that should be removed to taskManagerWrapper.js
 */
const _removeProxies = (proxies) => {
  _sendEvent(IPCKeys.RequestRemoveProxies, proxies);
};

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {};
  /* BRIDGED EVENTS */
  window.Bridge.launchYoutube = _launchYoutube;
  window.Bridge.launchCaptchaHarvester = _launchCaptchaHarvester;
  window.Bridge.closeAllCaptchaWindows = _closeAllCaptchaWindows;
  window.Bridge.close = _close;
  window.Bridge.refreshCaptchaWindow = _refreshCaptchaWindow;
  window.Bridge.harvestCaptchaToken = _harvestCaptchaToken;
  window.Bridge.endCaptchaSession = _endCaptchaSession;
  window.Bridge.getAppData = _getAppData;
  window.Bridge.deactivate = _deactivate;
  window.Bridge.authenticate = _authenticate;
  window.Bridge.confirmDialog = _confirmDialog;
  window.Bridge.registerForTaskEvents = _registerForTaskEvents;
  window.Bridge.deregisterForTaskEvents = _deregisterForTaskEvents;
  window.Bridge.startTasks = _startTasks;
  window.Bridge.stopTasks = _stopTasks;
  window.Bridge.addProxies = _addProxies;
  window.Bridge.removeProxies = _removeProxies;
  if (nebulaEnv.isDevelopment()) {
    window.Bridge.sendDebugCmd = (evt) => {
      _sendEvent('debug', evt);
    };
  }
});
