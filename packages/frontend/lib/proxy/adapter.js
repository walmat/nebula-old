// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcRenderer } = require('electron');
const { isEmpty } = require('underscore');

const { ProxyManager } = require('@nebula/proxy-management-service-built');

const IPCKeys = require('../common/constants');
const nebulaEnv = require('../_electron/env');

nebulaEnv.setUpEnvironment();

const _EVENT_KEY = 'ProxyEventKey';

class ProxyManagerServiceAdapter {
  constructor(logPath) {
    this.buffer = {};
    this._messageInterval = null;

    this._proxyManager = new ProxyManager(logPath);

    this._proxyManagementEventHandler = (id, status) => {
      if (status) {
        const last = this.buffer[id];

        if (!last) {
          this.buffer[id] = status;
        } else {
          this.buffer[id] = {
            ...last,
            ...status,
          }
        }
      }
    };

    this._proxyManagerEventMessageSender = () => {
      if (!isEmpty(this.buffer)) {
        ipcRenderer.send(_EVENT_KEY, this.buffer);
        this.buffer = {};
      }
    }

    ipcRenderer.on(IPCKeys.RegisterProxyEventHandler, () => {
      if (this._proxyManager) {
        this._proxyManager.registerForProxyEvents(this._proxyManagementEventHandler);
        if (!this._messageInterval) {
          this._messageInterval = setInterval(this._proxyManagerEventMessageSender, 1500);
        }
      }
    });

    ipcRenderer.on(IPCKeys.DeregisterProxyEventHandler, () => {
      if (this._proxyManager) {
        this._proxyManager.deregisterForProxyEvents(this._proxyManagementEventHandler);
        if (this._messageInterval) {
          clearInterval(this._messageInterval);
        }
      }
    });

    ipcRenderer.on(IPCKeys.RequestStartGenerate, this._onStartGeneratorRequest.bind(this));
    ipcRenderer.on(IPCKeys.RequestStopGenerate, this._onStopGeneratorRequest.bind(this));
    ipcRenderer.on(IPCKeys.RequestDestroyProxies, this._onDestroyProxiesRequest.bind(this));
  }

  async abortAll() {
    await this._proxyManager.stopAll([], { force: true, wait: true });
  }

  _onStartGeneratorRequest(_, data, options) {
    this._proxyManager.start(data, options);
  }

  _onStopGeneratorRequest(_, data) {
    this._proxyManager.stop(data);
  }

  _onDestroyProxiesRequest(_, data) {
    this._proxyManager.destroy(data);
  }
}

process.once('loaded', () => {
  let pma = null;
  ipcRenderer.once('LOG_PATH', (_, logPath) => {
    console.log('received log path...');
    console.log(ipcRenderer);
    pma = new ProxyManagerServiceAdapter(logPath);
  });
});
