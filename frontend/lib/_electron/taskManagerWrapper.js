const TaskManager = require('task-runner/shopify/taskManager');

const IPCKeys = require('../common/constants');

class TaskManagerWrapper {
  constructor(context) {
    this._context = context;

    this._taskManager = new TaskManager();

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
  }

  _onRegisterEventRequest(handler) {
    this._taskManager.registerForTaskEvents(handler);
  }

  _onDeregisterEventRequest(handler) {
    this._taskManager.deregisterForTaskEvents(handler);
  }

  _onStartTasksRequest(tasks) {
    if (tasks instanceof Array) {
      this._taskManager.startAll(tasks);
    } else {
      this._taskManager.start(tasks);
    }
  }

  _onStopTasksRequest(tasks) {
    if (tasks instanceof Array) {
      this._taskManager.stopAll(tasks);
    } else {
      this._taskManager.stop(tasks);
    }
  }

  _onAddProxiesRequest(proxies) {
    this._taskManager.registerProxies(proxies);
  }

  _onRemoveProxiesRequest(proxies) {
    this._taskManager.deregisterProxies(proxies);
  }
}

module.exports = TaskManagerWrapper;
