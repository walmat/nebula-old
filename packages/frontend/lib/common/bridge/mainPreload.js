// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcRenderer } = require('electron');
const { TaskRunnerTypes } = require('@nebula/task-runner').shopify;

const IPCKeys = require('../constants');
const nebulaEnv = require('../../_electron/env');
const { base, util } = require('./index');

nebulaEnv.setUpEnvironment();

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
const _startTasks = (tasks, options) => {
  util.sendEvent(IPCKeys.RequestStartTasks, tasks, options);
};

const _startShippingRatesRunner = task =>
  new Promise((resolve, reject) => {
    const response = {};
    const srrMessageHandler = (_, id, type, payload) => {
      // Only respond to specific id and type
      if (id === task.id && type === TaskRunnerTypes.ShippingRates) {
        // Runner type is exposed from the task-runner package
        response.shippingRates = payload.rates || response.shippingRates; // update rates if it exists
        response.selectedRate = payload.selected || response.selectedRate; // update selected if it exists
        if (payload.done) {
          // SRR is done
          _deregisterForTaskEvents(srrMessageHandler);
          if (!response.shippingRates || !response.selectedRate) {
            // Reject since we don't have the required data
            reject(new Error('Data was not provided!'));
          } else {
            // Resolve since we have the required data
            resolve(response);
          }
        }
      }
    };
    _registerForTaskEvents(srrMessageHandler);
    _startTasks({ ...task, sizes: ['Random'] }, { type: TaskRunnerTypes.ShippingRates });
  });

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
    launchCaptchaHarvester: _launchCaptchaHarvester,
    setTheme: _setTheme,
    startShippingRatesRunner: _startShippingRatesRunner,
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
