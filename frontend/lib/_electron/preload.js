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

// Wrap ipcRenderer call
const _sendEvent = (channel, msg) => {
  ipcRenderer.send(channel, msg);
};

// Send a deactivate window event
const _deactivate = () => {
  _sendEvent(IPCKeys.AuthRequestDeactivate);
};

// Send a deactivate window event
const _authenticate = (key) => {
  _sendEvent(IPCKeys.AuthRequestActivate, key);
};

// Send a close window event
const _close = () => {
  const { id } = remote.getCurrentWindow();
  _sendEvent(IPCKeys.RequestCloseWindow, id);
};

// Send a launchYoutube window event
const _launchYoutube = () => {
  _sendEvent(IPCKeys.RequestCreateNewWindow, 'youtube');
};

const _launchHarvester = () => {
  _sendEvent(IPCKeys.RequestCreateNewWindow, 'captcha');
};

const _endSession = () => {
  _sendEvent(IPCKeys.RequestEndSession);
};

const _harvest = (token) => {
  _sendEvent(IPCKeys.HarvestCaptcha, token);
};

const _refresh = (window) => {
  _sendEvent(IPCKeys.RequestRefresh, window);
};

const _confirmDialog = async message =>
  new Promise((resolve) => {
    dialog.showMessageBox({
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Confirm',
      message,
    }, response => resolve(response === 0));
  });

// Once the process is loaded, create api bridge
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
