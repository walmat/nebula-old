class Notification {
  constructor(hooks) {
    this._hooks = hooks;
    this.embed = null;
  }

  /**
   * Implemented in subclasses
   */
  // eslint-disable-next-line class-methods-use-this
  build() {
    throw new Error('Should be implemented in subclasses!');
  }

  /**
   * Sends a rich embed to the sender
   * @param {Discord || Slack} sender The Discord of Slack subclass sender object
   */
  send(sender) {
    if (this.embed) {
      sender.send(this.embed);
    }
  }
}
module.exports = Notification;
