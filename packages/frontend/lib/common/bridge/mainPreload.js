// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcRenderer } = require('electron');

const IPCKeys = require('../constants');
const nebulaEnv = require('../../_electron/env');
const { base, util } = require('./index');

nebulaEnv.setUpEnvironment();

const _checkForUpdates = () => {
  util.sendEvent(IPCKeys.RequestCheckForUpdates);
};

/**
 * Sends the deactivate trigger to authManager.js
 */
const _deactivate = () => {
  util.sendEvent(IPCKeys.AuthRequestDeactivate);
};

const _closeAllCaptchaWindows = () => {
  util.sendEvent(IPCKeys.RequestCloseAllCaptchaWindows);
};

/**
 * Sends the launch captcha window trigger to windowManager.js
 */
const _launchCaptchaHarvester = opts => {
  util.sendEvent(IPCKeys.RequestCreateNewWindow, 'captcha', opts);
};

/**
 * Sends a listener for task events to launcher.js
 */
const _registerForTaskEvents = handler => {
  util.sendEvent(IPCKeys.RequestRegisterTaskEventHandler);
  ipcRenderer.once(IPCKeys.RequestRegisterTaskEventHandler, (event, eventKey) => {
    // Check and make sure we have a key to listen on
    if (eventKey) {
      util.handleEvent(eventKey, handler);
    } else {
      console.error('Unable to Register for Task Events!');
    }
  });
};

/**
 * Removes a listener for task events to launcher.js
 */
const _deregisterForTaskEvents = handler => {
  util.sendEvent(IPCKeys.RequestDeregisterTaskEventHandler);
  ipcRenderer.once(IPCKeys.RequestDeregisterTaskEventHandler, (event, eventKey) => {
    // Check and make sure we have a key to deregister from
    if (eventKey) {
      util.removeEvent(eventKey, handler);
    } else {
      console.error('Unable to Deregister from Task Events!');
    }
  });
};

/**
 * Sends task(s) that should be started to launcher.js
 */
const _startTasks = tasks => {
  util.sendEvent(IPCKeys.RequestStartTasks, tasks);
};

/**
 * Sends task(s) that should be stopped to launcher.js
 */
const _stopTasks = tasks => {
  util.sendEvent(IPCKeys.RequestStopTasks, tasks);
};

/**
 * Sends proxies(s) that should be add to launcher.js
 */
const _addProxies = proxies => {
  util.sendEvent(IPCKeys.RequestAddProxies, proxies);
};

/**
 * Sends task(s) that should be removed to launcher.js
 */
const _removeProxies = proxies => {
  util.sendEvent(IPCKeys.RequestRemoveProxies, proxies);
};

const _changeDelay = (delay, type) => {
  util.sendEvent(IPCKeys.RequestChangeDelay, delay, type);
};

const _updateHook = (hook, type) => {
  util.sendEvent(IPCKeys.RequestWebhookUpdate, hook, type);
};

const _sendWebhookTestMessage = (hook, type) => {
  util.sendEvent(IPCKeys.RequestWebhookTest, hook, type);
};

const _setTheme = opts => {
  util.sendEvent(IPCKeys.ChangeTheme, opts);
};

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {
    ...base,
    /* PRIVATE EVENTS */
    checkForUpdates: _checkForUpdates,
    launchCaptchaHarvester: _launchCaptchaHarvester,
    setTheme: _setTheme,
    closeAllCaptchaWindows: _closeAllCaptchaWindows,
    deactivate: _deactivate,
    registerForTaskEvents: _registerForTaskEvents,
    deregisterForTaskEvents: _deregisterForTaskEvents,
    startTasks: _startTasks,
    stopTasks: _stopTasks,
    addProxies: _addProxies,
    removeProxies: _removeProxies,
    changeDelay: _changeDelay,
    updateHook: _updateHook,
    sendWebhookTestMessage: _sendWebhookTestMessage,
  };
});
