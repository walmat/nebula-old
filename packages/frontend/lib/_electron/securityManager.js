/* eslint-disable class-methods-use-this */
const psList = require('ps-list');

class SecurityManager {
  async isHTTPLoggerRunning() {
    const processList = JSON.stringify(await psList());
    return processList.test(/charles|proxyman|fiddler|httpfox/i);
  }
}

module.exports = SecurityManager;
