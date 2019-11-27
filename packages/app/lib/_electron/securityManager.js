/* eslint-disable class-methods-use-this */
const psList = require('ps-list');

class SecurityManager {
  async isHTTPLoggerRunning() {
    const processList = JSON.stringify(await psList());
    return /charles|proxyman|fiddler|httpfox/i.test(processList);
  }
}

module.exports = SecurityManager;
