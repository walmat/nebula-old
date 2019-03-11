// eslint-disable-next-line import/no-extraneous-dependencies
const Electron = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const IPCKeys = require('../common/constants');
const nebulaEnv = require('./env');
const { createAboutWindow, createAuthWindow, createMainWindow, urls } = require('./windows');

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
     * Separate manager to handle captcha windows
     */
    this._captchaWindowManager = new CaptchaWindowManager(context);

    /**
     * IPC Function Definitions
     */
    context.ipc.on(IPCKeys.RequestCreateNewWindow, this._onRequestCreateNewWindow.bind(this));
    context.ipc.on(IPCKeys.RequestSendMessage, this._onRequestSendMessage.bind(this));
    context.ipc.on(IPCKeys.RequestGetWindowIDs, this._onRequestGetWindowIDs.bind(this));
    context.ipc.on(IPCKeys.RequestCloseWindow, this._onRequestWindowClose.bind(this));
    // TODO: Add this back in #350 (https://github.com/walmat/nebula/issues/350)
    // context.ipc.on(IPCKeys.ChangeTheme, this.onRequestChangeTheme.bind(this));
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
          w = createAboutWindow();
          this._aboutDialog = w;
          break;
        }
        case 'auth': {
          if (this._auth) {
            return this._auth;
          }
          w = createAuthWindow();
          this._auth = w;
          break;
        }
        case 'main': {
          if (this._main) {
            return this._main;
          }
          w = createMainWindow();
          this._main = w;
          this._context.taskLauncher.start();
          break;
        }
        default: {
          // throw error if unsupported tag was passed
          throw new Error('Window Tag is Unsupported!');
        }
      }

      w.loadURL(urls.get(tag));
      this.addWindowEventListeners(w);
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
    // Store the winId in the upper scope so we don't throw an exception when
    // Trying to access win (which could already be destroyed)
    const winId = win.id;
    return () => {
      if (nebulaEnv.isDevelopment()) {
        console.log(`Window was closed, id = ${winId}`);
      }
      this._windows.delete(winId);
      this._notifyUpdateWindowIDs(winId);

      if (this._aboutDialog && winId === this._aboutDialog.id) {
        this._aboutDialog = null;
      } else if (this._main && winId === this._main.id) {
        this._main = null;
        // Always close captcha windows when the main window closes
        this._captchaWindowManager.closeAllCaptchaWindows();
      } else if (this._auth && winId === this._auth.id) {
        this._auth = null;
      }
    };
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
    this._context.taskLauncher.start();
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
  _onRequestCreateNewWindow(ev, tag, opts) {
    if (tag === 'captcha') {
      // Use captcha window manager to spawn captcha window
      this._captchaWindowManager.spawnCaptchaWindow(opts);
      ev.sender.send(IPCKeys.FinishCreateNewWindow);
    } else {
      try {
        const createdWindow = this.createNewWindow(tag);
        ev.sender.send(IPCKeys.FinishCreateNewWindow);
        this._notifyUpdateWindowIDs(createdWindow.id);
      } catch (err) {
        console.log('[ERROR]: %s', err.message);
        ev.sender.send(IPCKeys.FinishCreateNewWindow);
      }
    }
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
  _onRequestWindowClose(_, id) {
    if (this._main && this._main.id === id) {
      // close all windows
      this._captchaWindowManager.closeAllCaptchaWindows();
      this._windows.forEach(w => {
        w.close();
      });
      this._context.taskLauncher.stop();
    } else if (this._auth && this._auth.id === id) {
      this._captchaWindowManager.closeAllCaptchaWindows();
      this._windows.forEach(w => {
        w.close();
      });
    }
  }

  /**
   * Start Harvesting Captchas for a specific task
   *
   * Forward call to Captcha Window Manager
   */
  startHarvestingCaptcha(runnerId, siteKey) {
    this._captchaWindowManager.startHarvesting(runnerId, siteKey);
  }

  /**
   * Stop Harvesting Captchas for a specific task
   *
   * Forward call to Captcha Window Manager
   */
  stopHarvestingCaptcha(runnerId, siteKey) {
    this._captchaWindowManager.stopHarvesting(runnerId, siteKey);
  }

  /**
   * Get Next Captcha
   *
   * Forward call to Captcha Window Manager
   */
  getNextCaptcha() {
    return this._captchaWindowManager.getNextCaptcha();
  }

  // // TODO: Add this back in #350 (https://github.com/walmat/nebula/issues/350)
  // onRequestChangeTheme(_, opts) {
  //   const { backgroundColor } = opts;
  //   // TODO: Use captcha window manager in this case...
  //   this._captchas.forEach((__, windowId) => {
  //     const win = this._windows.get(windowId);
  //     /**
  //      * I've tried:
  //      * 1. win.setBackgroundColor(backgroundColor);
  //      * 2. win.webContents.browserWindowOptions.backgroundColor = backgroundColor;
  //      */
  //   });
  // }
}

module.exports = WindowManager;
