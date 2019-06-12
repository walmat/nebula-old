// eslint-disable-next-line import/no-extraneous-dependencies
const Electron = require('electron');
const path = require('path');

const IPCKeys = require('../common/constants');
const nebulaEnv = require('../_electron/env');

nebulaEnv.setUpEnvironment();
const _EVENT_KEY = 'ProxyEventKey';

const _LOG_PATH = Electron.app.getPath('documents');

class ProxyManagementServiceLauncher {
  constructor(context) {
    this._context = context;
    this._launcherWindow = null;
    this._eventListeners = [];
    this._proxyEventHandler = this._proxyEventHandler.bind(this);

    context.ipc.on(
      IPCKeys.RequestRegisterProxyEventHandler,
      this._onRegisterEventRequest.bind(this),
    );

    context.ipc.on(
      IPCKeys.RequestDeregisterProxyEventHandler,
      this._onDeregisterEventRequest.bind(this),
    );

    [
      IPCKeys.RequestStartGenerate,
      IPCKeys.RequestStopGenerate,
      IPCKeys.RequestDestroyProxies,
    ].forEach(k => {
      context.ipc.on(k, (ev, ...params) => {
        if (this._launcherWindow && ev.sender !== this._launcherWindow.webContents) {
          this._sendToLauncher(k, ...params);
        }
      });
    });
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
      this._sendToLauncher(IPCKeys.RegisterProxyEventHandler);
      this._context.ipc.on(_EVENT_KEY, this._proxyEventHandler);
    });

    if (this._launcherWindow) {
      this._launcherWindow.webContents.on('destroyed', async () => {
        // Remove launcher window reference if it gets destroyed by an outside source
        if (this._launcherWindow) {
          await this.abortAllTasks();
          this._launcherWindow.close();
        }
        this._launcherWindow = null;

        // Remove the handler for listening to task event statuses
        this._context.ipc.removeListener(_EVENT_KEY, this._proxyEventHandler);
      });
    }

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
    await this.abortAll();
    if (this._launcherWindow) {
      this._launcherWindow.close();
    }
  }

  async abortAll() {
    // Nothing to do if we haven't launched yet
    if (!this._launcherWindow) {
      return;
    }
    await new Promise(resolve => {
      this._context.ipc.once(IPCKeys.RequestAbortAllGeneratorsForClose, ev => {
        if (this._launcherWindow && this._launcherWindow.webContents === ev.sender) {
          resolve();
        }
      });
      this._sendToLauncher(IPCKeys.RequestAbortAllGeneratorsForClose);
    });
  }

  _sendToLauncher(channel, ...params) {
    if (this._launcherWindow) {
      this._launcherWindow.webContents.send(channel, ...params);
    }
  }

  _proxyEventHandler(_, buffer) {
    // forward event if we have listeners
    if (this._eventListeners.length > 0) {
      const workingListeners = [];
      this._eventListeners.forEach(l => {
        try {
          l.send(_EVENT_KEY, buffer);
          workingListeners.push(l);
        } catch (e) {
          // fail silently...
          // TODO: add a log message once we get winston added to the frontend
        }
      });
      this._eventListeners = workingListeners;
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
      event.sender.send(IPCKeys.RequestRegisterProxyEventHandler, _EVENT_KEY);
    } else {
      // Send a response with no key, reporting an error...
      event.sender.send(IPCKeys.RequestRegisterProxyEventHandler, null);
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
      event.sender.send(IPCKeys.RequestDeregisterProxyEventHandler, _EVENT_KEY);
    } else {
      // Send a response with no key to notify an error
      event.sender.send(IPCKeys.RequestDeregisterProxyEventHandler, null);
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
}

module.exports = ProxyManagementServiceLauncher;
