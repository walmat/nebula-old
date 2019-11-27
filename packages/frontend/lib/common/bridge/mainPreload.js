/* eslint-disable global-require */
// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcRenderer, shell } = require('electron');
const { IPCKeys } = require('../constants');
const nebulaEnv = require('../../_electron/env');
const { base, util } = require('./index');

nebulaEnv.setUpEnvironment();

let TaskTypes;
if (nebulaEnv.isDevelopment()) {
  // eslint-disable-next-line import/no-extraneous-dependencies
  ({ TaskTypes } = require('@nebula/task'));
} else {
  ({ TaskTypes } = require('@nebula/task-built'));
}

let rateFetcherRequest = null;
let handlers = [];
const RATE_FETCHER_ID = 1000000000;

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

const _stopTasks = tasks => {
  util.sendEvent(IPCKeys.RequestStopTasks, tasks);
};

const _restartTasks = (tasks, options) => {
  util.sendEvent(IPCKeys.RequestRestartTasks, tasks, options);
};

const _startShippingRateTask = task => {
  const request = {
    task: { ...task, id: RATE_FETCHER_ID, size: 'Random', platform: 'Shopify' },
    cancel: () => {},
    promise: null,
  };

  if (rateFetcherRequest) {
    return Promise.reject(new Error('Rate Fetcher Task has already been started!'));
  }

  request.promise = new Promise((resolve, reject) => {
    const response = {};

    // Define srr message handler to retrive data
    const srrMessageHandler = (_, payload) => {
      // Only respond to specific type and id
      if (payload[RATE_FETCHER_ID] && payload[RATE_FETCHER_ID].type === TaskTypes.ShippingRates) {
        // Task type is exposed from the task package
        response.rates = payload[RATE_FETCHER_ID].rates || response.rates; // update rates if it exists
        response.selectedRate = payload[RATE_FETCHER_ID].selected || response.selectedRate; // update selected if it exists
        if (payload[RATE_FETCHER_ID].done) {
          // SRR is done
          _deregisterForTaskEvents(srrMessageHandler);
          if (!response.rates || !response.selectedRate) {
            // Reject since we don't have the required data
            reject(new Error('Data was not provided!'));
          } else {
            // Resolve since we have the required data
            resolve(response);
          }
          rateFetcherRequest = null;
        }
      }
    };

    // Define cancel method for request
    request.cancel = () => {
      _deregisterForTaskEvents(srrMessageHandler);
      _stopTasks(request.task);
      rateFetcherRequest = null;
      reject(new Error('Rate Fetcher was cancelled!'));
    };

    rateFetcherRequest = request;
    _registerForTaskEvents(srrMessageHandler);
    _startTasks(request.task, { type: TaskTypes.ShippingRates });
  });

  return request.promise;
};

const _stopShippingRateTask = () => {
  if (!rateFetcherRequest) {
    return Promise.reject(new Error('No Rate Fetcher Running'));
  }
  rateFetcherRequest.cancel();
  rateFetcherRequest = null;
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

if (process.env.NODE_ENV !== 'production') {
  window.__devtron = { require, process };
}

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {
    ...base,
    /* PRIVATE EVENTS */
    launchCaptchaHarvester: _launchCaptchaHarvester,
    setTheme: _setTheme,
    startShippingRateTask: _startShippingRateTask,
    stopShippingRateTask: _stopShippingRateTask,
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
