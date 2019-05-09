/* eslint-disable class-methods-use-this */
const { exec } = require('child_process');

class SecurityManager {
  async isRunning(query) {
    console.log(`[DEBUG]: Looking for processes matching ${query}`);

    const { platform } = process;

    console.log(`[DEBUG]: Platform detected: ${platform}`);
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
      return false;
    }

    return exec(cmd);
    // return new Promise(async resolve => {
    //   const { platform } = process;
    //   console.log(`[DEBUG]: Platform detected: ${platform}`);
    //   let cmd = '';
    //   switch (platform) {
    //     case 'win32': {
    //       cmd = 'tasklist';
    //       break;
    //     }
    //     case 'darwin': {
    //       cmd = `ps -ax | grep ${query}`;
    //       break;
    //     }
    //     case 'linux': {
    //       cmd = 'ps -A';
    //       break;
    //     }
    //     default:
    //       break;
    //   }
    //   if (cmd === '') {
    //     resolve(false);
    //   }
    //   const { stdout, stderr } = await exec(cmd);

    //   if (stderr) {
    //     resolve(false);
    //   }
    //   resolve(stdout.toLowerCase().indexOf(query.toLowerCase()) > -1);
    // });
  }
}

module.exports = SecurityManager;
