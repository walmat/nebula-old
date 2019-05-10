const {
  app: { getVersion },
} = require('electron');
const DiscordRPC = require('discord-rpc');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

class RPC {
  constructor(context) {
    this._context = context;
    this.clientId = '571372290994864146';
    this.startTimestamp = new Date();
    this.version = nebulaEnv.isDevelopment() ? 'FnF / Dev' : `v${getVersion()}`;

    try {
      DiscordRPC.register(this.clientId);
      this.rpc = new DiscordRPC.Client({ transport: 'ipc' });
      this.rpc.login({ clientId: this.clientId });
    } catch (e) {
      // fail silently...
    }
  }

  setActivity() {
    if ((this.rpc && !this.rpc.transport.socket) || !this._context.windowManager.main) {
      return;
    }

    this.rpc.setActivity({
      state: this.version,
      startTimestamp: this.startTimestamp,
      largeImageKey: 'logo',
      largeImageText: 'Nebula Orion',
      smallImageKey: 'twitter',
      smallImageText: '@nebulabots',
      instance: true,
    });
  }
}

module.exports = RPC;
