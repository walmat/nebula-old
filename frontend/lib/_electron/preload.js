const { remote } = require('electron');
const { dialog } = require('electron').remote;
const { ipcRenderer, webFrame } = require('electron');
require('./env').setUpEnvironment();

// disable zoom
webFrame.setVisualZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);

// Wrap ipcRenderer call
const _sendEvent = (channel, msg) => {
  ipcRenderer.send(channel, msg);
};

// Send a deactivate window event
const _deactivate = () => {
  // add event here as well..
  _sendEvent('AuthRequestDeactivate');
};

// Send a deactivate window event
const _authenticate = (key) => {
  _sendEvent('AuthRequestActivate', key);
};

// Send a close window event
const _close = () => {
  const { id } = remote.getCurrentWindow();
  _sendEvent('RequestCloseWindow', id);
};

// Send a launchYoutube window event
const _launchYoutube = () => {
  _sendEvent('RequestLaunchYoutube');
};

const _launchHarvester = () => {
  _sendEvent('RequestLaunchHarvester');
};

const _endSession = () => {
  _sendEvent('RequestEndSession');
};

const _harvest = (token) => {
  _sendEvent('harvest', token);
};

const _refresh = (window) => {
  _sendEvent('refresh', window);
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
  if (process.env.NEBULA_ENV === 'development') {
    window.Bridge.sendDebugCmd = (evt) => {
      _sendEvent('debug', evt);
    };
  }
});
