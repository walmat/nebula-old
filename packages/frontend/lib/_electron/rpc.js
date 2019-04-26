const DiscordRPC = require('discord-rpc');

class RPC {
  constructor(context) {
    this._context = context;
    this.clientId = '571372290994864146';
    this.startTimestamp = new Date();
    DiscordRPC.register(this.clientId);

    this.rpc = new DiscordRPC.Client({ transport: 'ipc' });

    this.rpc.on('ready', () => setInterval(() => this.setActivity(), 15e3));
    this.rpc.login({ clientId: this.clientId });
  }

  setActivity() {
    if (!this.rpc || !this._context.windowManager.main) {
      return;
    }

    this.rpc.setActivity({
      state: `Beta v7.4`,
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
