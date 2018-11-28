const Electron = require('electron');
const TaskManager = require('@nebula/task-runner/src/shopify/taskManager');
const IPCKeys = require('../common/constants');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();
const _TASK_EVENT_KEY = 'TaskEventKey';
const LOGS_PATH = Electron.app.getPath('documents');

class TaskManagerWrapper {
  constructor(context) {
    this._context = context;

    this._listeners = [];

    this._taskManager = new TaskManager(LOGS_PATH);

    this._taskEventHandler = this._taskEventHandler.bind(this);
    this._startHarvestEventHandler = this._startHarvestEventHandler.bind(this);
    this._stopHarvestEventHandler = this._stopHarvestEventHandler.bind(this);

    // TODO: Research if this should always listened to, or if we can dynamically
    //       Start/Stop listening like we with task events
    this._taskManager._events.on(
      TaskManager.Events.StartHarvest,
      this._startHarvestEventHandler,
    );
    this._taskManager._events.on(
      TaskManager.Events.StopHarvest,
      this._stopHarvestEventHandler,
    );

    context.ipc.on(
      IPCKeys.RequestRegisterTaskEventHandler,
      this._onRegisterEventRequest.bind(this),
    );

    context.ipc.on(
      IPCKeys.RequestDeregisterTaskEventHandler,
      this._onDeregisterEventRequest.bind(this),
    );

    context.ipc.on(
      IPCKeys.RequestStartTasks,
      this._onStartTasksRequest.bind(this),
    );

    context.ipc.on(
      IPCKeys.RequestStopTasks,
      this._onStopTasksRequest.bind(this),
    );

    context.ipc.on(
      IPCKeys.RequestAddProxies,
      this._onAddProxiesRequest.bind(this),
    );

    context.ipc.on(
      IPCKeys.RequestRemoveProxies,
      this._onRemoveProxiesRequest.bind(this),
    );

    context.ipc.on(IPCKeys.HarvestCaptcha, this._onHarvestToken.bind(this));

    // TEMPORARY
    if (nebulaEnv.isDevelopment()) {
      this._debugHarvestedTokens = [];
      this._debugSentTokens = [];
      context.ipc.on('debug', (ev, type, ...params) => {
        switch (type) {
          case 'testStartHarvest': {
            this._startHarvestEventHandler(params[0], params[1]);
            break;
          }
          case 'testStopHarvest': {
            this._stopHarvestEventHandler(params[0], params[1]);
            break;
          }
          case 'viewHarvestedFrontendTokens': {
            ev.sender.send('debug', type, this._debugHarvestedTokens);
            break;
          }
          default:
            break;
        }
      });
    }
  }

  _taskEventHandler(taskId, statusMessage) {
    this._listeners.forEach(l =>
      l.send(_TASK_EVENT_KEY, taskId, statusMessage),
    );
  }

  async _startHarvestEventHandler(runnerId, siteKey) {
    const key = siteKey || '6LeoeSkTAAAAAA9rkZs5oS82l69OEYjKRZAiKdaF';
    await this._context.windowManager.onRequestStartHarvestingCaptcha(
      runnerId,
      key,
    );
  }

  _stopHarvestEventHandler(runnerId, siteKey) {
    const key = siteKey || '6LeoeSkTAAAAAA9rkZs5oS82l69OEYjKRZAiKdaF';
    this._context.windowManager.onRequestStopHarvestingCaptcha(runnerId, key);
  }

  _addListener(listener) {
    this._listeners.push(listener);
    if (this._listeners.length === 1) {
      // Start listening for events since we have at least one listener
      this._taskManager.registerForTaskEvents(this._taskEventHandler);
    }
  }

  _removeListener(listener) {
    this._listeners.filter(l => l !== listener);
    if (this._listeners.length === 0) {
      // Stop listening for events since we don't have any listeners
      this._taskManager.deregisterForTaskEvents(this._taskEventHandler);
    }
  }

  _onHarvestToken(event, runnerId, token, siteKey, host) {
    console.log(
      `Harvesting Token: ${token}\nRunner: ${runnerId}\nkey: ${siteKey}`,
    );
    this._taskManager.harvestCaptchaToken(runnerId, token);
    if (nebulaEnv.isDevelopment()) {
      this._debugHarvestedTokens.push({
        runnerId,
        token,
        siteKey,
      });
    }
  }

  _onRegisterEventRequest(event) {
    // TODO: Add More Checks if the sender is allowed to register for task events...
    let authorized = true;
    // If the sender is already listening, they can't listen again...
    if (this._listeners.includes(event.sender)) {
      authorized = false;
    }

    if (authorized) {
      // Bump the number of listeners
      this._addListener(event.sender);

      // Send a response with the key to listen on...
      event.sender.send(
        IPCKeys.RequestRegisterTaskEventHandler,
        _TASK_EVENT_KEY,
      );
    } else {
      // Send a response with no key, reporting an error...
      event.sender.send(IPCKeys.RequestRegisterTaskEventHandler, null);
    }
  }

  _onDeregisterEventRequest(event) {
    // TODO: Add More Checks if the sender is allowed to deregister from task events...
    let authorized = true;
    // If we aren't listening for events, we can't deregister from listening to events!
    if (this._listeners.length === 0) {
      authorized = false;
    }
    // If the sender isn't listening, they can deregister from listening
    if (!this._listeners.includes(event.sender)) {
      authorized = false;
    }

    if (authorized) {
      // Dock the number of listeners, then check if we still need the event handler
      this._removeListener(event.sender);

      // Send a response with the key to listen on...
      event.sender.send(
        IPCKeys.RequestDeregisterTaskEventHandler,
        _TASK_EVENT_KEY,
      );
    } else {
      // Send a response with no key, reporting an error...
      event.sender.send(IPCKeys.RequestDeregisterTaskEventHandler, null);
    }
  }

  _onStartTasksRequest(event, tasks) {
    if (tasks instanceof Array) {
      this._taskManager.startAll(tasks);
    } else {
      this._taskManager.start(tasks);
    }
  }

  _onStopTasksRequest(event, tasks) {
    if (tasks instanceof Array) {
      this._taskManager.stopAll(tasks);
    } else {
      this._taskManager.stop(tasks);
    }
  }

  _onAddProxiesRequest(event, proxies) {
    this._taskManager.registerProxies(proxies);
  }

  _onRemoveProxiesRequest(event, proxies) {
    this._taskManager.deregisterProxies(proxies);
  }
}

module.exports = TaskManagerWrapper;