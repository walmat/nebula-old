/* eslint-disable prefer-promise-reject-errors */
const {
  remote: { dialog, app, getCurrentWindow },
  ipcRenderer,
  webFrame,
  // eslint-disable-next-line import/no-extraneous-dependencies
} = require('electron');

const jsonfile = require('jsonfile');

const IPCKeys = require('../constants');
const nebulaEnv = require('../../_electron/env');

nebulaEnv.setUpEnvironment();
let _debug = {};

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

const titleCase = str => {
  const splitStr = str.toLowerCase().split(' ');
  for (let i = 0; i < splitStr.length; i += 1) {
    splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  return splitStr.join(' ');
};

/**
 * Send app name/version to the renderer
 */
const _getAppData = () => {
  if (nebulaEnv.isDevelopment()) {
    return { name: 'Nebula Orion', version: 'Dev build' };
  }

  const name = app
    .getName()
    .replace('/', ' ')
    .replace('@', '');
  const version = app.getVersion();
  return { name: titleCase(name), version };
};

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
  const { id } = getCurrentWindow();
  _sendEvent(IPCKeys.RequestCloseWindow, id);
};

const _showDialog = async (message, type, buttons, title) =>
  new Promise(resolve => {
    dialog.showMessageBox(
      {
        type,
        buttons,
        title,
        message,
      },
      response => resolve(response === 0),
    );
  });

const _showSave = async state =>
  new Promise((resolve, reject) => {
    dialog.showSaveDialog(
      {
        title: 'Please Save State File',
        defaultPath: app.getPath('documents'),
        buttonLabel: 'Export State',
        filters: [
          {
            name: 'Nebula',
            extensions: ['nebula'],
          },
        ],
      },
      response => {
        if (!response) {
          reject({ error: new Error('Canceled') });
        }

        jsonfile
          .writeFile(response, state)
          .then(() => resolve({ success: true }))
          .catch(error => reject({ error }));
      },
    );
  });

const _showOpen = async () =>
  new Promise((resolve, reject) => {
    dialog.showOpenDialog(
      {
        title: 'Please Select State File',
        defaultPath: app.getPath('documents'),
        buttonLabel: 'Import State',
        filters: [
          {
            name: 'Nebula',
            extensions: ['nebula'],
          },
        ],
        properties: ['openFile'],
      },
      response => {
        if (!response || (response && !response.length)) {
          return reject({ error: new Error('Canceled') });
        }

        const [path] = response;

        if (!path) {
          return reject({ error: new Error('Unable to open file') });
        }

        return jsonfile
          .readFile(path)
          .then(data => {
            if (!data) {
              return reject({ error: new Error('Malformed state') });
            }

            return resolve({ success: true, data });
          })
          .catch(error => reject({ error }));
      },
    );
  });

const _sendDebugCmd = (...params) => {
  _sendEvent('debug', ...params);
};

if (nebulaEnv.isDevelopment()) {
  _debug = {
    sendDebugCmd: _sendDebugCmd,
  };

  _handleEvent('debug', (ev, type, ...params) => {
    console.log(`Received Response for type: ${type}`);
    console.log(params);
  });
}

module.exports = {
  base: {
    showDialog: _showDialog,
    showSave: _showSave,
    showOpen: _showOpen,
    close: _close,
    getAppData: _getAppData,
    ..._debug,
  },
  util: {
    handleEvent: _handleEvent,
    removeEvent: _removeEvent,
    sendEvent: _sendEvent,
  },
};
