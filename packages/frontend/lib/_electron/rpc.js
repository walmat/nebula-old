const {
  app: { getVersion },
  // eslint-disable-next-line import/no-extraneous-dependencies
} = require('electron');
const DiscordRPC = require('discord-rpc');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

class RPC {
  constructor(context) {
    this._context = context;
    this.clientId = '571372290994864146';
    DiscordRPC.register(this.clientId);
    this.client = new DiscordRPC.Client({ transport: 'ipc' });
    this.client.login({ clientId: this.clientId });

    this.startTimestamp = new Date();
    this.version = nebulaEnv.isDevelopment() ? 'FnF / Dev' : `v${getVersion()}`;
  }

  async setActivity() {
    if (!this.client || !this._context._windowManager._main) {
      return;
    }

    this.client.setActivity({
      details: '🎃👻💀⚰️',
      state: `${this.version}`,
      startTimestamp: this.startTimestamp,
      largeImageKey: 'logo',
      largeImageText: 'Nebula Orion',
      smallImageKey: 'twitter',
      smallImageText: '@nebulabots',
      instance: false,
    });
  }
}

module.exports = RPC;
