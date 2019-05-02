const DiscordRPC = require('discord-rpc');

class RPC {
  constructor(context) {
    this._context = context;
    this.clientId = '571372290994864146';
    this.startTimestamp = new Date();
    DiscordRPC.register(this.clientId);

    this.rpc = new DiscordRPC.Client({ transport: 'ipc' });

    this.rpc.login({ clientId: this.clientId });
  }

  setActivity() {
    if (!this.rpc || !this._context.windowManager.main) {
      return;
    }

    this.rpc.setActivity({
      state: `v1.0.0`,
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
