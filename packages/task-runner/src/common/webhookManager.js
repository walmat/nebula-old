class WebhookManager {
  constructor(logger) {
    this._logger = logger;

    this._queue = [];
    this._aborted = false;
  }

  // send hooks here! (if we fail, insert back into this._queue)
  notify() {}

  async send() {
    if (this._aborted) {
      return true;
    }

    if (this._queue.length) {
      await this.notify(this._queue.pop());
    }

    return false;
  }

  async run() {
    while (!this._aborted) {
      // eslint-disable-next-line no-await-in-loop
      this._aborted = await this.send();

      if (this._aborted) {
        return true;
      }
    }
    return false;
  }
}

module.exports = WebhookManager;
