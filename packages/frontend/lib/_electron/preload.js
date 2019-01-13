const { remote } = require('electron');
const { dialog, app } = require('electron').remote;
const { ipcRenderer, webFrame } = require('electron');
const IPCKeys = require('../common/constants');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

// disable zoom
webFrame.setVisualZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);

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
 * Sets up a listener for an IPC event
 *
 * @param {String} channel the channel to attach this handler to
 * @param {Function} handler the handler to call when a channel event is sent
 */
const _handleEvent = (channel, handler) => {
  ipcRenderer.on(channel, handler);
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
 * Sends the deactivate trigger to authManager.js
 */
const _deactivate = () => {
  _sendEvent(IPCKeys.AuthRequestDeactivate);
};

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
 * Sends the deactivate trigger to authManager.js
 *
 * @param {String} key user's license key (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)
 */
const _authenticate = key => {
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
 * Send app name/version to the renderer
 */
const _getAppData = () => ({ name: app.getName(), version: app.getVersion() });

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

/**
 * Sends a listener for task events to taskManagerWrapper.js
 */
const _registerForTaskEvents = handler => {
  _sendEvent(IPCKeys.RequestRegisterTaskEventHandler);
  ipcRenderer.once(
    IPCKeys.RequestRegisterTaskEventHandler,
    (event, eventKey) => {
      // Check and make sure we have a key to listen on
      if (eventKey) {
        _handleEvent(eventKey, handler);
      } else {
        console.error('Unable to Register for Task Events!');
      }
    },
  );
};

/**
 * Removes a listener for task events to taskManagerWrapper.js
 */
const _deregisterForTaskEvents = handler => {
  _sendEvent(IPCKeys.RequestDeregisterTaskEventHandler);
  ipcRenderer.once(
    IPCKeys.RequestDeregisterTaskEventHandler,
    (event, eventKey) => {
      // Check and make sure we have a key to deregister from
      if (eventKey) {
        _removeEvent(eventKey, handler);
      } else {
        console.error('Unable to Deregister from Task Events!');
      }
    },
  );
};

/**
 * Sends task(s) that should be started to taskManagerWrapper.js
 */
const _startTasks = tasks => {
  _sendEvent(IPCKeys.RequestStartTasks, tasks);
};

/**
 * Sends task(s) that should be stopped to taskManagerWrapper.js
 */
const _stopTasks = tasks => {
  _sendEvent(IPCKeys.RequestStopTasks, tasks);
};

/**
 * Sends proxies(s) that should be add to taskManagerWrapper.js
 */
const _addProxies = proxies => {
  _sendEvent(IPCKeys.RequestAddProxies, proxies);
};

/**
 * Sends task(s) that should be removed to taskManagerWrapper.js
 */
const _removeProxies = proxies => {
  _sendEvent(IPCKeys.RequestRemoveProxies, proxies);
};

// Disable eval in the preload context
// TEMPORARY DISABLE TILL WE SPLIT UP PRELOAD (NEEDED IN YOUTUBE WINDOWS)
// window.eval = global.eval = function() {
//   throw new Error('Sorry, this app does not support window.eval().');
// };

const _testWebhook = (hook, opt) => {
  _sendEvent(IPCKeys.RequestWebhookTest, { hook, opt });
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

  window.Bridge.testWebhook = _testWebhook;

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
