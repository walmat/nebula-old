// eslint-disable-next-line import/no-extraneous-dependencies
const Electron = require('electron');
const path = require('path');

const IPCKeys = require('../common/constants');
const nebulaEnv = require('../_electron/env');

nebulaEnv.setUpEnvironment();

const _TASK_EVENT_KEY = 'TaskEventKey';

const _LOG_PATH = Electron.app.getPath('documents');

class TaskLauncher {
  constructor(context) {
    this._context = context;
    this._launcherWindow = null;
    this._eventListeners = [];
    this._captchaSemaphore = 0;

    this._taskEventHandler = this._taskEventHandler.bind(this);

    // handle event listening requests
    context.ipc.on(
      IPCKeys.RequestRegisterTaskEventHandler,
      this._onRegisterEventRequest.bind(this),
    );
    context.ipc.on(
      IPCKeys.RequestDeregisterTaskEventHandler,
      this._onDeregisterEventRequest.bind(this),
    );
    context.ipc.on(IPCKeys.RequestStartHarvestCaptcha, this._startHarvestEventHandler.bind(this));
    context.ipc.on(IPCKeys.RequestStopHarvestCaptcha, this._stopHarvestEventHandler.bind(this));

    // Forward ipc requests to launcher
    [
      IPCKeys.RequestStartTasks,
      IPCKeys.RequestStopTasks,
      IPCKeys.RequestAddProxies,
      IPCKeys.RequestRemoveProxies,
      IPCKeys.RequestChangeDelay,
      IPCKeys.HarvestCaptcha,
      IPCKeys.RequestWebhookUpdate,
      IPCKeys.RequestWebhookTest,
    ].forEach(key => {
      context.ipc.on(key, (ev, ...params) => {
        if (this._launcherWindow && ev.sender !== this._launcherWindow.webContents) {
          this._sendToLauncher(key, ...params);
        }
      });
    });

    // TEMPORARY
    if (nebulaEnv.isDevelopment()) {
      this._debugHarvestedTokens = [];
      this._debugSentTokens = [];
      context.ipc.on('debug', (ev, type, ...params) => {
        switch (type) {
          case 'testStartHarvest': {
            this._startHarvestEventHandler(params[0] || 'testid1', params[1]);
            break;
          }
          case 'testStopHarvest': {
            this._stopHarvestEventHandler(params[0] || 'testid1', params[1]);
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

      // attach a secondary listener to track harvested tokens
      context.ipc.on(IPCKeys.HarvestCaptcha, (_, runnerId, token, siteKey) => {
        this._debugHarvestedTokens.push({
          runnerId,
          token,
          siteKey,
        });
      });
    }
  }

  async start() {
    const session = await this._context.authManager.getSession();
    if (!session) {
      if (nebulaEnv.isDevelopment()) {
        console.log('Frontend is not authed! Skipping start...');
      }
      return;
    }

    if (this._launcherWindow) {
      if (nebulaEnv.isDevelopment()) {
        console.log('Already Launched! skipping start...');
      }
      return;
    }

    if (nebulaEnv.isDevelopment()) {
      console.log('Launching...');
    }
    const managerUrl = `file:///${path.resolve(__dirname, 'launcher.html')}`;
    this._launcherWindow = new Electron.BrowserWindow({
      frame: false,
      fullscreenable: false,
      movable: false,
      center: false,
      resizable: false,
      show: false,
      hasShadow: false,
      webPreferences: {
        // This is needed to make sure the task manager runs properly
        // TODO: Investigate more secure methods of running the task manager in a browser window
        nodeIntegration: true,
        // This is needed when running in multi thread mode
        // TODO: Add a check to make sure we are running in this mode before enabling
        nodeIntegrationInWorker: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalCanvasFeatures: false,
        experimentalFeatures: false,
        enableBlinkFeatures: '',
        preload: path.resolve(__dirname, 'adapter.js'),
      },
    });

    this._launcherWindow.loadURL(managerUrl);

    this._launcherWindow.on('ready-to-show', () => {
      this._sendToLauncher('LOG_PATH', _LOG_PATH);
      // open dev tools if dev env
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        console.log('Launcher Ready!');
        this._launcherWindow.webContents.openDevTools();
      }

      // Start listening for events since we have at least one listener
      this._sendToLauncher(IPCKeys.RegisterTaskEventHandler);
      this._context.ipc.on(_TASK_EVENT_KEY, this._taskEventHandler);
    });

    this._launcherWindow.webContents.on('destroyed', () => {
      // Remove launcher window reference if it gets destroyed by an outside source
      this._launcherWindow = null;

      // Remove the handler for listening to task event statuses
      this._context.ipc.removeListener(_TASK_EVENT_KEY, this._taskEventHandler);
    });

    this._launcherWindow.on('close', () => {
      if (nebulaEnv.isDevelopment()) {
        console.log('Launcher Closed!');
      }
      this._launcherWindow = null;
    });

    if (nebulaEnv.isDevelopment()) {
      console.log('Launched!');
    }
  }

  async stop() {
    if (!this._launcherWindow) {
      if (nebulaEnv.isDevelopment()) {
        console.log('launcher was already stopped');
      }
      return;
    }

    if (nebulaEnv.isDevelopment()) {
      console.log('Closing Launcher...');
    }
    await this.abortAllTasks();
    this._launcherWindow.close();
    this._launcherWindow = null;
  }

  async abortAllTasks() {
    // Nothing to do if we haven't launched yet
    if (!this._launcherWindow) {
      return;
    }
    await new Promise(resolve => {
      this._context.ipc.once(IPCKeys.RequestAbortAllTasksForClose, ev => {
        if (this._launcherWindow.webContents === ev.sender) {
          resolve();
        }
      });
      this._sendToLauncher(IPCKeys.RequestAbortAllTasksForClose);
    });
  }

  _sendToLauncher(channel, ...params) {
    if (this._launcherWindow) {
      this._launcherWindow.webContents.send(channel, ...params);
    }
  }

  _taskEventHandler(_, taskId, statusMessage) {
    // forward event if we have listeners
    if (this._eventListeners.length > 0) {
      this._eventListeners.forEach(l => l.send(_TASK_EVENT_KEY, taskId, statusMessage));
    }
  }

  _onRegisterEventRequest(event) {
    let authorized = true;
    // If the sender is already listening, they can't listen again...
    if (this._eventListeners.includes(event.sender)) {
      authorized = false;
    }

    if (authorized) {
      // Bump the number of listeners
      this._addEventListener(event.sender);

      // Send a response with the key to listen on...
      event.sender.send(IPCKeys.RequestRegisterTaskEventHandler, _TASK_EVENT_KEY);
    } else {
      // Send a response with no key, reporting an error...
      event.sender.send(IPCKeys.RequestRegisterTaskEventHandler, null);
    }
  }

  _onDeregisterEventRequest(event) {
    let authorized = true;
    // If we aren't listening for events, we can't deregister from listening to events!
    if (this._eventListeners.length === 0) {
      authorized = false;
    }
    // If the sender isn't listening, they can't deregister from listening
    if (!this._eventListeners.includes(event.sender)) {
      authorized = false;
    }

    if (authorized) {
      // Dock the number of listeners, then check if we still need the event handler
      this._removeEventListener(event.sender);

      // Send a response with the key to notify of success
      event.sender.send(IPCKeys.RequestDeregisterTaskEventHandler, _TASK_EVENT_KEY);
    } else {
      // Send a response with no key to notify an error
      event.sender.send(IPCKeys.RequestDeregisterTaskEventHandler, null);
    }
  }

  _addEventListener(listener) {
    // Don't do anything if we haven't launched yet
    if (!this._launcherWindow) {
      return;
    }
    this._eventListeners.push(listener);
  }

  _removeEventListener(listener) {
    // Don't do anything if we haven't launched yet
    if (!this._launcherWindow) {
      return;
    }
    this._eventListeners = this._eventListeners.filter(l => l !== listener);
  }

  async _startHarvestEventHandler(
    _,
    runnerId,
    siteKey = '6LeoeSkTAAAAAA9rkZs5oS82l69OEYjKRZAiKdaF',
  ) {
    // If this is the first harvest event, start harvesting
    if (this._captchaSemaphore === 0) {
      console.log('Sending start...');
      await this._context.windowManager.startHarvestingCaptcha(runnerId, siteKey);
    }
    this._captchaSemaphore += 1;
  }

  _stopHarvestEventHandler(_, runnerId, siteKey = '6LeoeSkTAAAAAA9rkZs5oS82l69OEYjKRZAiKdaF') {
    if (this._captchaSemaphore === 1) {
      // Captcha Harvest Requesters will drop to 0
      // Drop the semaphore and stop harvesting
      this._captchaSemaphore -= 1;
      this._context.windowManager.stopHarvestingCaptcha(runnerId, siteKey);
    } else if (this._captchaSemaphore > 0) {
      // There are still Captcha Harvest Requesters
      // Drop the semaphore, but continue harvesting
      this._captchaSemaphore -= 1;
    }
  }
}

module.exports = TaskLauncher;
