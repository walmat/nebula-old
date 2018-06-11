const { ipcRenderer } = require('electron');

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
<<<<<<< HEAD
=======

const _launchHarvester = () => {
  _sendEvent('window-event', 'launchHarvester');
};

const _endSession = () => {
  _sendEvent('window-event', 'endSession');
};
>>>>>>> master

// Once the process is loaded, create api bridge
process.once('loaded', () => {
  window.Bridge = window.Bridge || {};

  /*BRIDGED EVENTS*/
  window.Bridge.launchYoutube = _launchYoutube;
  window.Bridge.launchHarvester= _launchHarvester;
  window.Bridge.endSession = _endSession;
  window.Bridge.quit = _quit;
});
