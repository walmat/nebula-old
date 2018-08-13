const { dialog } = require('electron').remote;
const { ipcRenderer, webFrame } = require('electron');

// disable zoom
webFrame.setVisualZoomLevelLimits(1, 1);
// webFrame.setZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);

// Wrap ipcRenderer call
const _sendEvent = (channel, msg) => {
  ipcRenderer.send(channel, msg);
};

// Send a quit window event
const _quit = () => {
  _sendEvent('window-event', 'quit');
};

// Send a launchYoutube window event
const _launchYoutube = () => {
  _sendEvent('window-event', 'launchYoutube');
};

const _launchHarvester = () => {
  _sendEvent('window-event', 'launchHarvester');
};

const _endSession = () => {
  _sendEvent('window-event', 'endSession');
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
  window.Bridge.refresh = _refresh;
  window.Bridge.harvest = _harvest;
  window.Bridge.endSession = _endSession;
  window.Bridge.quit = _quit;
  window.Bridge.confirmDialog = _confirmDialog;
});
