/* eslint-disable global-require */
// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcRenderer, shell } = require('electron');
const { TaskRunnerTypes } = require('@nebula/task-runner-built');

const { IPCKeys } = require('../constants');
const nebulaEnv = require('../../_electron/env');
const { base, util } = require('./index');

nebulaEnv.setUpEnvironment();

let srrRequest = null;
let handlers = [];
const SRR_ID = 1000;

const taskEventHandler = (...params) => handlers.forEach(h => h(...params));

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
  if (handlers.length > 0) {
    handlers.push(handler);
  } else {
    util.sendEvent(IPCKeys.RequestRegisterTaskEventHandler);
    ipcRenderer.once(IPCKeys.RequestRegisterTaskEventHandler, (event, eventKey) => {
      // Check and make sure we have a key to listen on
      if (eventKey) {
        handlers.push(handler);
        util.handleEvent(eventKey, taskEventHandler);
      } else {
        console.error('Unable to Register for Task Events!');
      }
    });
  }
};

/**
 * Removes a listener for task events to launcher.js
 */
const _deregisterForTaskEvents = handler => {
  if (handlers.length === 1) {
    util.sendEvent(IPCKeys.RequestDeregisterTaskEventHandler);
    ipcRenderer.once(IPCKeys.RequestDeregisterTaskEventHandler, (event, eventKey) => {
      // Check and make sure we have a key to deregister from
      if (eventKey) {
        util.removeEvent(eventKey, taskEventHandler);
        handlers = [];
      } else {
        console.error('Unable to Deregister from Task Events!');
      }
    });
  }
  handlers = handlers.filter(h => h !== handler);
};

/**
 * Removes all listeners if the window was closed
 */
window.onbeforeunload = () => {
  handlers.forEach(h => _deregisterForTaskEvents(h));
};

const _openInDefaultBrowser = url => {
  if (!url) {
    return;
  }

  shell.openExternal(url);
};

/**
 * Sends task(s) that should be started to launcher.js
 */
const _startTasks = (tasks, options) => {
  util.sendEvent(IPCKeys.RequestStartTasks, tasks, options);
};

const _restartTasks = (tasks, options) => {
  util.sendEvent(IPCKeys.RequestRestartTasks, tasks, options);
};

/**
 * Sends task(s) that should be stopped to launcher.js
 */
const _stopTasks = tasks => {
  util.sendEvent(IPCKeys.RequestStopTasks, tasks);
};

const _startShippingRatesRunner = task => {
  const request = {
    task: { ...task, id: SRR_ID, size: 'Random', platform: 'Shopify' },
    cancel: () => {},
    promise: null,
  };

  if (srrRequest) {
    return Promise.reject(new Error('Shipping Rates Runner has already been started!'));
  }

  request.promise = new Promise((resolve, reject) => {
    const response = {};

    // Define srr message handler to retrive data
    const srrMessageHandler = (_, payload) => {
      // Only respond to specific type and id
      if (payload[SRR_ID] && payload[SRR_ID].type === TaskRunnerTypes.ShippingRates) {
        // Runner type is exposed from the task-runner package
        response.rates = payload[SRR_ID].rates || response.rates; // update rates if it exists
        response.selectedRate = payload[SRR_ID].selected || response.selectedRate; // update selected if it exists
        if (payload[SRR_ID].done) {
          // SRR is done
          _deregisterForTaskEvents(srrMessageHandler);
          if (!response.rates || !response.selectedRate) {
            // Reject since we don't have the required data
            reject(new Error('Data was not provided!'));
          } else {
            // Resolve since we have the required data
            resolve(response);
          }
          srrRequest = null;
        }
      }
    };

    // Define cancel method for request
    request.cancel = () => {
      _deregisterForTaskEvents(srrMessageHandler);
      _stopTasks(request.task);
      srrRequest = null;
      reject(new Error('Runner was cancelled'));
    };

    srrRequest = request;
    _registerForTaskEvents(srrMessageHandler);
    _startTasks(request.task, { type: TaskRunnerTypes.ShippingRates });
  });

  return request.promise;
};

const _stopShippingRatesRunner = () => {
  if (!srrRequest) {
    return Promise.reject(new Error('No SRR Running'));
  }
  srrRequest.cancel();
  srrRequest = null;
  return Promise.resolve();
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

const _testProxy = async (url, proxy) => {
  const fetch = require('node-fetch');
  const HttpsProxyAgent = require('https-proxy-agent');
  let start;
  let stop;
  const [host, port, username, password] = proxy.split(':');
  const agent = new HttpsProxyAgent(`http://${username}:${password}@${host}:${port}`);
  try {
    start = performance.now();
    await fetch(url, {
      method: 'GET',
      agent,
    });
    stop = performance.now();
    return (stop - start).toFixed(0);
  } catch (err) {
    return null;
  }
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
    stopShippingRatesRunner: _stopShippingRatesRunner,
    closeAllCaptchaWindows: _closeAllCaptchaWindows,
    deactivate: _deactivate,
    registerForTaskEvents: _registerForTaskEvents,
    deregisterForTaskEvents: _deregisterForTaskEvents,
    startTasks: _startTasks,
    restartTasks: _restartTasks,
    stopTasks: _stopTasks,
    openInDefaultBrowser: _openInDefaultBrowser,
    addProxies: _addProxies,
    removeProxies: _removeProxies,
    changeDelay: _changeDelay,
    updateHook: _updateHook,
    testProxy: _testProxy,
    sendWebhookTestMessage: _sendWebhookTestMessage,
  };
});