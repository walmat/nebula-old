// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcRenderer } = require('electron');

const {
  TaskManager,
  SplitWebWorkerTaskManager,
  // SplitWorkerThreadTaskManager, // TODO: Add this back in when we implement it (#412)
  SplitProcessTaskManager,
} = require('@nebula/task-runner').shopify;

const IPCKeys = require('../common/constants');
const nebulaEnv = require('../_electron/env');

nebulaEnv.setUpEnvironment();

const _TASK_EVENT_KEY = 'TaskEventKey';

class TaskManagerAdapter {
  constructor(logPath) {
    /**
     * :: taskId, [statusMessages]
     */
    this.statusMessageBuffer = {};
    this._messageInterval = null;

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
      // TODO: Add this back in when we implement it (#412)
      // case 'threads': {
      //   this._taskManager = new SplitWorkerThreadTaskManager(logPath);
      //   break;
      // }
      case 'workers': {
        this._taskManager = new SplitWebWorkerTaskManager(logPath);
        break;
      }
      default: {
        // Use worker threads TaskManager as default if supported
        try {
          // TODO: Move this to worker threads when we implement it (#412)
          this._taskManager = new SplitWebWorkerTaskManager(logPath);
        } catch (_) {
          console.log(
            '[WARNING]: Web Workers are not supported in this environment! Falling back to multi-process manager...',
          );
          this._taskManager = new SplitProcessTaskManager(logPath);
        }
        break;
      }
    }

    this._taskEventHandler = (taskId, statusMessage) => {
      // grab the old messages (if they exists)..
      if (statusMessage) {
        const lastMessage = this.statusMessageBuffer[taskId];
        if (!lastMessage) {
          this.statusMessageBuffer[taskId] = statusMessage;
        } else {
          this.statusMessageBuffer[taskId] = {
            ...lastMessage,
            ...statusMessage,
          };
        }
      }
    };

    this._taskEventMessageSender = () => {
      if (this.statusMessageBuffer) {
        ipcRenderer.send(_TASK_EVENT_KEY, this.statusMessageBuffer);
        this.statusMessageBuffer = {};
      }
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
        if (!this._messageInterval) {
          this._messageInterval = setInterval(this._taskEventMessageSender, 1500);
        }
      }
    });
    ipcRenderer.on(IPCKeys.DeregisterTaskEventHandler, () => {
      if (this._taskManager) {
        this._taskManager.deregisterForTaskEvents(this._taskEventHandler);
        if (this._messageInterval) {
          clearInterval(this._messageInterval);
        }
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

  _onStartTasksRequest(_, tasks, options) {
    if (tasks instanceof Array) {
      this._taskManager.startAll(tasks, options);
    } else {
      this._taskManager.start(tasks, options);
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
