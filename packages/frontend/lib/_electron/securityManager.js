/* eslint-disable class-methods-use-this */
const psList = require('ps-list');

class SecurityManager {
  async isHTTPLoggerRunning() {
    const processList = JSON.stringify(await psList()).toUpperCase();

    return (
      processList.indexOf('CHARLES') > -1 ||
      processList.indexOf('PROXYMAN') > -1 ||
      processList.indexOf('FIDDLER') > -1 ||
      processList.indexOf('HTTPFOX') > -1
    );
  }
}

module.exports = SecurityManager;
