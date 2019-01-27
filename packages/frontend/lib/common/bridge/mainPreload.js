// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcRenderer } = require('electron');

const IPCKeys = require('../constants');
const nebulaEnv = require('../../_electron/env');
const {
  _close,
  _sendEvent,
  _handleEvent,
  _confirmDialog,
  _removeEvent,
  _getAppData,
} = require('./index');

nebulaEnv.setUpEnvironment();

/**
 * Sends the deactivate trigger to authManager.js
 */
const _deactivate = () => {
  _sendEvent(IPCKeys.AuthRequestDeactivate);
};

/**
 * Sends the harvest captcha trigger to windowManager.js
 */
const _harvestCaptchaToken = (runnerId, token, siteKey) => {
  _sendEvent(IPCKeys.HarvestCaptcha, runnerId, token, siteKey);
};

const _closeAllCaptchaWindows = () => {
  _sendEvent(IPCKeys.RequestCloseAllCaptchaWindows);
};

/**
 * Sends the launch captcha window trigger to windowManager.js
 */
const _launchCaptchaHarvester = () => {
  _sendEvent(IPCKeys.RequestCreateNewWindow, 'captcha');
};

/**
 * Sends a listener for task events to taskManagerWrapper.js
 */
const _registerForTaskEvents = handler => {
  _sendEvent(IPCKeys.RequestRegisterTaskEventHandler);
  ipcRenderer.once(IPCKeys.RequestRegisterTaskEventHandler, (event, eventKey) => {
    // Check and make sure we have a key to listen on
    if (eventKey) {
      _handleEvent(eventKey, handler);
    } else {
      console.error('Unable to Register for Task Events!');
    }
  });
};

/**
 * Removes a listener for task events to taskManagerWrapper.js
 */
const _deregisterForTaskEvents = handler => {
  _sendEvent(IPCKeys.RequestDeregisterTaskEventHandler);
  ipcRenderer.once(IPCKeys.RequestDeregisterTaskEventHandler, (event, eventKey) => {
    // Check and make sure we have a key to deregister from
    if (eventKey) {
      _removeEvent(eventKey, handler);
    } else {
      console.error('Unable to Deregister from Task Events!');
    }
  });
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

const _changeDelay = (delay, type) => {
  _sendEvent(IPCKeys.RequestChangeDelay, delay, type);
};

const _testWebhook = (hook, opt) => {
  _sendEvent(IPCKeys.RequestWebhookTest, { hook, opt });
};

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {};
  /* BRIDGED EVENTS */
  window.Bridge.launchCaptchaHarvester = _launchCaptchaHarvester;
  window.Bridge.harvestCaptchaToken = _harvestCaptchaToken;
  window.Bridge.closeAllCaptchaWindows = _closeAllCaptchaWindows;
  window.Bridge.close = _close;
  window.Bridge.getAppData = _getAppData;
  window.Bridge.deactivate = _deactivate;
  window.Bridge.confirmDialog = _confirmDialog;
  window.Bridge.registerForTaskEvents = _registerForTaskEvents;
  window.Bridge.deregisterForTaskEvents = _deregisterForTaskEvents;
  window.Bridge.startTasks = _startTasks;
  window.Bridge.stopTasks = _stopTasks;
  window.Bridge.addProxies = _addProxies;
  window.Bridge.removeProxies = _removeProxies;
  window.Bridge.changeDelay = _changeDelay;

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
