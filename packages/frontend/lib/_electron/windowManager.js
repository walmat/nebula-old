// eslint-disable-next-line import/no-extraneous-dependencies
const Electron = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const IPCKeys = require('../common/constants');
const nebulaEnv = require('./env');
const {
  createAboutWindow,
  createAuthWindow,
  createCaptchaWindow,
  createMainWindow,
  createYouTubeWindow,
  urls,
} = require('./windows');

const CaptchaWindowManager = require('./captchaWindowManager');

nebulaEnv.setUpEnvironment();

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'debug';
autoUpdater.autoInstallOnAppQuit = false;

// TODO: Enable these once we start adding a custom UI (See issue #305)
// autoUpdater.on('checking-for-update', e => {
//   log.info('CHECKING FOR UPDATE', e);
// });
// autoUpdater.on('update-available', info => {
//   log.info('UPDATE AVAILABLE: ', info);
// });
// autoUpdater.on('update-not-available', info => {
//   log.info('UPDATE NOT AVAILABLE: ', info);
// });
// autoUpdater.on('error', err => {
//   log.info('ERROR: ', err);
// });
// autoUpdater.on('download-progress', progressObj => {
//   log.info('DOWNLOADING: ', progressObj.bytesPerSecond);
// });

autoUpdater.on('update-downloaded', info => {
  log.info('NEW UPDATE DOWNLOADED: ', info);
  const { version } = info;
  Electron.dialog.showMessageBox(
    {
      type: 'question',
      title: 'New Update',
      message: `Version ${version} has been downloaded! Nebula will automatically update on the next launch. Would you like to update now?`,
      buttons: ['Update Now', 'Update Later'],
      cancelId: 1,
      defaultId: 0,
    },
    response => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    },
  );
});

/**
 * Manage the window.
 */
class WindowManager {
  /**
   * Initialize instance.
   *
   * @param {App} context Application context.
   */
  constructor(context) {
    /**
     * Application context.
     * @type {App}
     */
    this._context = context;

    /**
     * Collection of a managed window.
     * @type {Map.<String, BrowserWindow>}
     */
    this._windows = new Map();

    /**
     * About dialog.
     * @type {BrowserWindow}
     */
    this._aboutDialog = null;

    /**
     * Main Window
     * @type {BrowserWindow}
     */
    this._main = null;

    /**
     * Auth Window
     * @type {BrowserWindow}
     */
    this._auth = null;

    /**
     * Captcha Windows
     */
    this._captchas = new Map();

    /**
     * IPC Function Definitions
     */
    context.ipc.on(IPCKeys.RequestCreateNewWindow, this._onRequestCreateNewWindow.bind(this));
    context.ipc.on(IPCKeys.RequestSendMessage, this._onRequestSendMessage.bind(this));
    context.ipc.on(IPCKeys.RequestGetWindowIDs, this._onRequestGetWindowIDs.bind(this));
    context.ipc.on(IPCKeys.RequestCloseWindow, this._onRequestWindowClose.bind(this));
    context.ipc.on(
      IPCKeys.RequestCloseAllCaptchaWindows,
      this._onRequestCloseAllCaptchaWindows.bind(this),
    );
  }

  /**
   * Reload the focused window, For debug.
   * @param {BrowserWindow} win Browser Window Reference
   */
  static reload(win) {
    const w = win || Electron.BrowserWindow.getFocusedWindow();
    if (w) {
      w.reload();
    }
  }

  /**
   * Switch the display of the developer tools window at focused window, For debug.
   * @param {BrowserWindow} win Browser Window Reference
   */
  static toggleDevTools(win) {
    const w = win || Electron.BrowserWindow.getFocusedWindow();
    if (w) {
      w.toggleDevTools();
    }
  }

  /**
   * Create the main application window.
   * @param {String} tag String matching window to be created
   * @return {BrowserWindow} Created window
   */
  async createNewWindow(tag) {
    let w; // window reference
    const session = await this._context._authManager.getSession();
    if (session || ['auth', 'about'].includes(tag)) {
      switch (tag) {
        case 'about': {
          if (this._aboutDialog) {
            return this._aboutDialog;
          }
          w = await createAboutWindow();
          this._aboutDialog = w;
          break;
        }
        case 'auth': {
          if (this._auth) {
            return this._auth;
          }
          w = await createAuthWindow();
          this._auth = w;
          break;
        }
        case 'main': {
          if (this._main) {
            return this._main;
          }
          w = await createMainWindow();
          this._main = w;
          this._context.taskLauncher.start();
          break;
        }
        case 'captcha': {
          if (this._captchas.size < 5) {
            if (!this._context.captchaServerManager.isRunning) {
              console.log('[DEBUG]: Starting captcha server...');
              this._context.captchaServerManager.start();
            }
            w = await createCaptchaWindow();
            this._captchas.set(w.id, new CaptchaWindowManager(this._context, w));
            w.loadURL('http://checkout.shopify.com');
          }
          break;
        }
        case 'youtube': {
          w = await createYouTubeWindow();
          break;
        }
        default:
          break;
      }

      if (tag !== 'captcha') {
        w.loadURL(urls.get(tag));
      }

      // Make sure window was created before adding event listeners
      if (w) {
        this.addWindowEventListeners(w);
      }

      return w;
    }
    return this.transitionToDeauthedState();
  }

  addWindowEventListeners(win) {
    win.on('ready-to-show', this.handleShow(win));
    win.on('close', this.handleClose(win));
  }

  /**
   * Function to handle a new window when it's shown
   *
   * @param {BrowserWindow} win reference to the window being shown
   */
  handleShow(win) {
    return () => {
      // open dev tools if dev env
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        console.log(`Window was opened, id = ${win.id}`);
        win.webContents.openDevTools();
      }

      // add window & id to windows map, notify other windows, and finally, show the window
      this._windows.set(win.id, win);
      this._notifyUpdateWindowIDs(win.id);
      win.show();

      if (win === this._main) {
        log.info('Starting update check...');
        autoUpdater.checkForUpdatesAndNotify();
      }
    };
  }

  /**
   * Function to handle a new window when it's closed
   *
   * @param {BrowserWindow} win reference to the window being closed
   */
  handleClose(win) {
    return () => {
      if (nebulaEnv.isDevelopment()) {
        console.log(`Window was closed, id = ${win.id}`);
      }
      this._windows.delete(win.id);
      this._notifyUpdateWindowIDs(win.id);

      if (this._aboutDialog && win.id === this._aboutDialog.id) {
        this._aboutDialog = null;
      } else if (this._main && win.id === this._main.id) {
        this._main = null;
      } else if (this._auth && win.id === this._auth.id) {
        this._auth = null;
      } else if (this._captchas.size > 0) {
        this._captchas.forEach(captchaWindowManager => {
          if (win.id === captchaWindowManager._captchaWindow.id) {
            // deregister the interval from the captcha window
            WindowManager.handleCloseCaptcha(this._captchas.get(win.id));
            this._captchas.delete(win.id);
          } else if (
            captchaWindowManager._youtubeWindow &&
            win.id === captchaWindowManager._youtubeWindow.id
          ) {
            captchaWindowManager._youtubeWindow = null;
          }
        });
        if (this._captchas.size === 0) {
          // Close the server
          console.log('[DEBUG]: Stopping captcha server...');
          this._context.captchaServerManager.stop();
        }
      }
    };
  }

  static handleCloseCaptcha(win) {
    win._tokens = [];
    clearInterval(win._checkTokens);
    win._checkTokens = null;
  }

  /**
   * Function to handle the transition between main -> auth window
   */
  async transitionToDeauthedState() {
    this._auth = await createAuthWindow();
    const winUrl = urls.get('auth');
    this._auth.loadURL(winUrl);

    this._auth.on('ready-to-show', this.handleShow(this._auth));
    this._auth.on('close', this.handleClose(this._auth));

    this._windows.forEach(w => {
      if (w.id !== this._auth.id) {
        w.close();
      }
    });
    this._context.taskLauncher.stop();
    return this._auth;
  }

  /**
   * Function to handle the transition between auth -> main window
   */
  async transitiontoAuthedState() {
    this._main = await createMainWindow();
    const winUrl = urls.get('main');
    this._main.loadURL(winUrl);

    this._main.on('ready-to-show', this.handleShow(this._main));
    this._main.on('close', this.handleClose(this._main));

    this._windows.forEach(w => {
      if (w.id !== this._main.id) {
        w.close();
      }
    });
    return this._main;
  }

  /**
   * Notify that the window ID list has been updated.
   *
   * @param {Number} excludeID Exclude ID.
   */
  _notifyUpdateWindowIDs(excludeID) {
    const windowIDs = [];

    this._windows.forEach((_, key) => {
      windowIDs.push(key);
    });

    this._windows.forEach(w => {
      if (w.id === excludeID) {
        return;
      }

      w.webContents.send(IPCKeys.UpdateWindowIDs, windowIDs);
    });
  }

  /**
   * Occurs when a show new window requested.
   *
   * @param {IPCEvent} ev Event data.
   */
  _onRequestCreateNewWindow(ev, tag) {
    const createdWindow = this.createNewWindow(tag);
    ev.sender.send(IPCKeys.FinishCreateNewWindow);

    this._notifyUpdateWindowIDs(createdWindow.id);
  }

  /**
   * Occurs when a send message requested.
   *
   * @param {IPCEvent} ev Event data.
   * @param {Number} id Target window's identifier.
   * @param {String} message Message.
   */
  _onRequestSendMessage(ev, id, message) {
    const w = this._windows.get(id);
    if (w) {
      w.webContents.send(IPCKeys.UpdateMessage, message);
    }

    ev.sender.send(IPCKeys.FinishSendMessage);
  }

  /**
   * Occurs when a get window identifiers requested.
   *
   * @param {IPCEvent} ev Event data.
   */
  _onRequestGetWindowIDs(ev) {
    const windowIDs = Array.from(this._windows.keys());
    ev.sender.send(IPCKeys.FinishGetWindowIDs, windowIDs);
  }

  /**
   * Occurs when any window sends a close event
   * @param {IPCEvent} ev Event data.
   * @param {Number} id corresponding window id
   */
  _onRequestWindowClose(ev, id) {
    if (this._main && this._main.id === id) {
      // close all windows
      this._windows.forEach(w => {
        w.close();
      });
      this._context.taskLauncher.stop();
    } else if (this._auth && this._auth.id === id) {
      this._windows.forEach(w => {
        w.close();
      });
    } else if (this._captchas.size > 0) {
      this._captchas.forEach(w => {
        if (id === w._captchaWindow.id) {
          if (w._youtubeWindow) {
            w._youtubeWindow.close();
          }
          w._captchaWindow.close();
        }
      });
    } else if (this._aboutDialog && this._aboutDialog.id === id) {
      this._windows.forEach(w => {
        if (w.id === id) {
          w.close();
        }
      });
    }
  }

  /**
   * Request to close all open captcha windows
   * @param {EventEmitter} ev - close event
   * BUG: closes one at a time..
   */
  _onRequestCloseAllCaptchaWindows() {
    if (this._captchas.size > 0) {
      this._captchas.forEach(captchaWindowManager => {
        captchaWindowManager._captchaWindow.close();
        if (captchaWindowManager._youtubeWindow) {
          captchaWindowManager._youtubeWindow.close();
        }
      });
    }
  }

  /**
   * Start Harvesting Captchas for a specific task
   * // TODO This should be moved to CaptchaWindowManager when issue #97 gets tackled
   * // https://github.com/walmat/nebula/issues/97
   */
  async onRequestStartHarvestingCaptcha(runnerId, siteKey) {
    let open = false;
    if (this._captchas.size === 0) {
      open = true;
      await this.createNewWindow('captcha');
    }
    this._captchas.forEach(captchaWindowManager => {
      captchaWindowManager.startHarvestingCaptcha(runnerId, siteKey, open);
    });
  }

  /**
   * Stop Harvesting Captchas for a specific task
   * // TODO This should be moved to CaptchaWindowManager when issue #97 gets tackled
   * // https://github.com/walmat/nebula/issues/97
   */
  onRequestStopHarvestingCaptcha(runnerId, siteKey) {
    if (this._captchas.size > 0) {
      this._captchas.forEach(captchaWindowManager => {
        captchaWindowManager.stopHarvestingCaptcha(runnerId, siteKey);
      });
    }
  }
}

module.exports = WindowManager;
