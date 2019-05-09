/* eslint-disable class-methods-use-this */
const psList = require('ps-list');

class SecurityManager {
  async isRunning() {
    return (
      JSON.stringify(await psList())
        .toUpperCase()
        .indexOf('CHARLES') > -1
    );
  }
}

module.exports = SecurityManager;
