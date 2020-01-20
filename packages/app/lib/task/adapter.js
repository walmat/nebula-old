/* eslint-disable no-return-assign */
/* eslint-disable global-require */
// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcRenderer } = require('electron');
const { isEmpty } = require('lodash');

const { IPCKeys } = require('../common/constants');
const nebulaEnv = require('../_electron/env');

nebulaEnv.setUpEnvironment();
let TaskManager;

if (nebulaEnv.isDevelopment()) {
  // eslint-disable-next-line import/no-extraneous-dependencies
  ({ TaskManager } = require('@nebula/task'));
} else {
  ({ TaskManager } = require('@nebula/task-built'));
}

const _TASK_EVENT_KEY = 'TaskEventKey';

class TaskManagerAdapter {
  constructor(logPath) {
    /**
     * :: taskId, [statusMessages]
     */
    this.statusMessages = {};
    this._messageInterval = null;

    this._taskManager = new TaskManager(logPath);

    ipcRenderer.setMaxListeners(0);

    /**
     * @Param taskIds {List<String>} - List of task ids
     * @Param statusMessage {Object} - Incoming status message object for that task
     */
    this._taskEventHandler = async (taskIds, message) => {
      if (message) {
        [...taskIds].forEach(taskId => {
          const previous = this.statusMessages[taskId];
          this.statusMessages[taskId] = {
            ...previous,
            ...message,
          };
        });
      }
      return null;
    };

    this._taskEventMessageSender = () => {
      if (this.statusMessages && !isEmpty(this.statusMessages)) {
        ipcRenderer.send(_TASK_EVENT_KEY, this.statusMessages);
        this.statusMessages = {};
      }
    };

    // TODO: Research if this should always listened to, or if we can dynamically
    //       Start/Stop listening like we with task events
    this._taskManager.captchaManager._events.on(TaskManager.Events.StartHarvest, (...args) => {
      ipcRenderer.send(IPCKeys.RequestStartHarvestCaptcha, ...args);
    });
    this._taskManager.captchaManager._events.on(TaskManager.Events.StopHarvest, (...args) =>
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
          // batch status updates every 150 milliseconds
          this._messageInterval = setInterval(this._taskEventMessageSender, 150);
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
    ipcRenderer.on(IPCKeys.RequestRestartTasks, this._onRestartTasksRequest.bind(this));
    ipcRenderer.on(IPCKeys.RequestStopTasks, this._onStopTasksRequest.bind(this));
    ipcRenderer.on(IPCKeys.RequestAddWebhooks, this._onAddWebhooksRequest.bind(this));
    ipcRenderer.on(IPCKeys.RequestRemoveWebhooks, this._onRemoveWebhooksRequest.bind(this));
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

  _onHarvestToken(_, id, token, sitekey) {
    console.log(`Harvesting Token: ${token}\nTask: ${id}\nkey: ${sitekey}`);
    this._taskManager.captchaManager.harvest(id, token, sitekey);
  }

  _onStartTasksRequest(_, tasks, options) {
    if (tasks instanceof Array) {
      this._taskManager.startAll(tasks, options);
    } else {
      this._taskManager.start(tasks, options);
    }
  }

  _onRestartTasksRequest(_, tasks, options) {
    if (tasks instanceof Array) {
      this._taskManager.restartAll(tasks, options);
    } else {
      this._taskManager.restart(tasks, options);
    }
  }

  _onStopTasksRequest(_, tasks) {
    if (tasks instanceof Array) {
      this._taskManager.stopAll(tasks, {});
    } else {
      this._taskManager.stop(tasks);
    }
  }

  _onAddWebhooksRequest(_, webhooks) {
    this._taskManager.webhookManager.registerAll(webhooks);
  }

  _onRemoveWebhooksRequest(_, webhooks) {
    this._taskManager.webhookManager.deregisterAll(webhooks);
  }

  _onAddProxiesRequest(_, proxies) {
    this._taskManager.proxyManager.registerAll(proxies);
  }

  _onRemoveProxiesRequest(_, proxies) {
    this._taskManager.proxyManager.deregisterAll(proxies);
  }

  _onChangeDelayRequest(_, delay, type, tasks) {
    this._taskManager.changeDelay(delay, type, tasks);
  }

  _onRequestWebhookUpdate(_, hook, type) {
    this._taskManager.updateHook(hook, type);
  }

  _onRequestWebhookTest(_, hook, type) {
    this._taskManager.webhookManager.test(hook, type);
  }
}

process.once('loaded', () => {
  let tma = null;
  ipcRenderer.once('LOG_PATH', (_, logPath) => {
    console.log(`Received log path: ${logPath}`);
    tma = new TaskManagerAdapter(logPath);
  });
});
