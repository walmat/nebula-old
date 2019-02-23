// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcRenderer } = require('electron');
const {
  TaskManager,
  SplitThreadTaskManager,
  SplitProcessTaskManager,
} = require('@nebula/task-runner').shopify;

const IPCKeys = require('../common/constants');
const nebulaEnv = require('../_electron/env');

nebulaEnv.setUpEnvironment();

const _TASK_EVENT_KEY = 'TaskEventKey';

class TaskManagerAdapter {
  constructor(logPath) {
    // Use environment to initialize the right task manager
    switch (process.env.NEBULA_RUNNER_CONCURRENCY_TYPE) {
      case 'single': {
        this._taskManager = new TaskManager(logPath);
        break;
      }
      case 'process': {
        this._taskManager = new SplitProcessTaskManager(logPath);
        break;
      }
      case 'thread':
      default: {
        // Use multithread TaskManager as default if supported
        try {
          this._taskManager = new SplitThreadTaskManager(logPath);
        } catch (_) {
          console.log(
            '[WARNING]: Worker Thread are not supported in this environment! Falling back to multi-process manager...',
          );
          this._taskManager = new SplitProcessTaskManager(logPath);
        }
        break;
      }
    }

    this._taskEventHandler = (taskId, statusMessage) => {
      ipcRenderer.send(_TASK_EVENT_KEY, taskId, statusMessage);
    };

    // TODO: Research if this should always listened to, or if we can dynamically
    //       Start/Stop listening like we with task events
    this._taskManager._events.on(TaskManager.Events.StartHarvest, (...args) =>
      ipcRenderer.send(IPCKeys.RequestStartHarvestCaptcha, ...args),
    );
    this._taskManager._events.on(TaskManager.Events.StopHarvest, (...args) =>
      ipcRenderer.send(IPCKeys.RequestStopHarvestCaptcha, ...args),
    );

    ipcRenderer.on(IPCKeys.RequestAbortAllTasksForClose, async () => {
      await this.abortAllTasks();
      ipcRenderer.send(IPCKeys.RequestAbortAllTasksForClose);
    });
    ipcRenderer.on(IPCKeys.RegisterTaskEventHandler, () => {
      if (this._taskManager) {
        this._taskManager.registerForTaskEvents(this._taskEventHandler);
      }
    });
    ipcRenderer.on(IPCKeys.DeregisterTaskEventHandler, () => {
      if (this._taskManager) {
        this._taskManager.deregisterForTaskEvents(this._taskEventHandler);
      }
    });
    ipcRenderer.on(IPCKeys.RequestStartTasks, this._onStartTasksRequest.bind(this));
    ipcRenderer.on(IPCKeys.RequestStopTasks, this._onStopTasksRequest.bind(this));
    ipcRenderer.on(IPCKeys.RequestAddProxies, this._onAddProxiesRequest.bind(this));
    ipcRenderer.on(IPCKeys.RequestRemoveProxies, this._onRemoveProxiesRequest.bind(this));
    ipcRenderer.on(IPCKeys.RequestChangeDelay, this._onChangeDelayRequest.bind(this));
    ipcRenderer.on(IPCKeys.HarvestCaptcha, this._onHarvestToken.bind(this));
    ipcRenderer.on(IPCKeys.RequestWebhookUpdate, this._onRequestWebhookUpdate.bind(this));
    ipcRenderer.on(IPCKeys.RequestWebhookTest, this._onRequestWebhookTest.bind(this));
  }

  async abortAllTasks() {
    // force stop all tasks
    await this._taskManager.stopAll([], { force: true, wait: true });
  }

  _onHarvestToken(_, runnerId, token, siteKey) {
    console.log(`Harvesting Token: ${token}\nRunner: ${runnerId}\nkey: ${siteKey}`);
    this._taskManager.harvestCaptchaToken(runnerId, token);
  }

  _onStartTasksRequest(_, tasks) {
    if (tasks instanceof Array) {
      this._taskManager.startAll(tasks);
    } else {
      this._taskManager.start(tasks);
    }
  }

  _onStopTasksRequest(_, tasks) {
    if (tasks instanceof Array) {
      this._taskManager.stopAll(tasks);
    } else {
      this._taskManager.stop(tasks);
    }
  }

  _onAddProxiesRequest(_, proxies) {
    this._taskManager.registerProxies(proxies);
  }

  _onRemoveProxiesRequest(_, proxies) {
    this._taskManager.deregisterProxies(proxies);
  }

  _onChangeDelayRequest(_, delay, type) {
    this._taskManager.changeDelay(delay, type);
  }

  _onRequestWebhookUpdate(_, hook, type) {
    this._taskManager.updateHook(hook, type);
  }

  _onRequestWebhookTest(_, hook, type) {
    this._taskManager.testWebhook(hook, type);
  }
}

process.once('loaded', () => {
  let tma = null;
  ipcRenderer.once('LOG_PATH', (_, logPath) => {
    console.log('received log path...');
    console.log(ipcRenderer);
    tma = new TaskManagerAdapter(logPath);
  });
});
