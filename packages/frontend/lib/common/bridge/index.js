/**
 * Shared location for all preload scripts
 */
// eslint-disable-next-line import/no-extraneous-dependencies
const { remote, ipcRenderer, webFrame } = require('electron');

const { dialog, app } = remote;
const IPCKeys = require('../constants');
const nebulaEnv = require('../../_electron/env');

nebulaEnv.setUpEnvironment();

// disable zoom
webFrame.setVisualZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);

/**
 * Prevent dragover events globally
 */
window.addEventListener(
  'dragover',
  event => {
    event.preventDefault();
    return false;
  },
  false,
);

/**
 * Prevent drop events globally
 */
window.addEventListener(
  'drop',
  event => {
    event.preventDefault();
    return false;
  },
  false,
);

/**
 * Send app name/version to the renderer
 */
const _getAppData = () => ({ name: app.getName(), version: app.getVersion() });

/**
 * Sends IPCMain an event trigger
 *
 * @param {String} channel definition for which trigger to look for
 * @param {*} msg any object to send along with the event || null
 */
const _sendEvent = (channel, ...params) => {
  ipcRenderer.send(channel, ...params);
};

/**
 * Remove an Event Listener from an IPC event
 *
 * @param {String} channel the channel where this handler should be removed from
 * @param {Function} handler the same function reference that was used when attaching
 */
const _removeEvent = (channel, handler) => {
  ipcRenderer.removeListener(channel, handler);
};

/**
 * Sets up a listener for an IPC event
 *
 * @param {String} channel the channel to attach this handler to
 * @param {Function} handler the handler to call when a channel event is sent
 */
const _handleEvent = (channel, handler) => {
  ipcRenderer.on(channel, handler);
};

/**
 * Sends the close window trigger to windowManager.js
 */
const _close = () => {
  const { id } = remote.getCurrentWindow();
  _sendEvent(IPCKeys.RequestCloseWindow, id);
};

/**
 * ... TODO!
 * Sends the confirmation dialog trigger to windowManager.js
 */
const _confirmDialog = async message =>
  new Promise(resolve => {
    dialog.showMessageBox(
      {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm',
        message,
      },
      response => resolve(response === 0),
    );
  });

module.exports = {
  _confirmDialog,
  _close,
  _removeEvent,
  _handleEvent,
  _sendEvent,
  _getAppData,
};
