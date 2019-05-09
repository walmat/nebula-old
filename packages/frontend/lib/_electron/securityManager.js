const { exec } = require('child_process');

class SecurityManager {
  constructor() {
    this.isLoggerRunning = setInterval(() => SecurityManager.isRunning('charles.exe'), 2500);
  }

  static isRunning(query) {
    return new Promise(resolve => {
      const { platform } = process;
      let cmd = '';
      switch (platform) {
        case 'win32': {
          cmd = 'tasklist';
          break;
        }
        case 'darwin': {
          cmd = `ps -ax | grep ${query}`;
          break;
        }
        case 'linux': {
          cmd = 'ps -A';
          break;
        }
        default:
          break;
      }
      if (cmd === '') {
        resolve(false);
      }
      exec(cmd, (err, stdout) => {
        console.log(stdout.toLowerCase().indexOf(query.toLowerCase()) > -1);
        resolve(stdout.toLowerCase().indexOf(query.toLowerCase()) > -1);
      });
    });
  }
}

module.exports = SecurityManager;
