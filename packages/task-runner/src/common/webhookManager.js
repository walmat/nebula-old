class WebhookManager {
  constructor(logger) {
    this._logger = logger;
    this._queue = [];
  }

  // send hooks here..
  notify({ embed, client }) {
    const interval = setInterval(async () => {
      try {
        await client.send(embed);
        clearInterval(interval);
      } catch (e) {
        this._logger.error('Error sending webhook! %j', e);
        // fail silently...
      }
    }, 2500);
  }

  insert(datum) {
    if (datum) {
      this._queue.push(datum);
    }
  }

  async send() {
    if (this._queue.length) {
      await this.notify(this._queue.pop());
    }
  }
}

module.exports = WebhookManager;
