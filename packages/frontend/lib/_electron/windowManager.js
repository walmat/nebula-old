// eslint-disable-next-line import/no-extraneous-dependencies
const Electron = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const { IPCKeys } = require('../common/constants');
const nebulaEnv = require('./env');
const {
  createAboutWindow,
  createSplashWindow,
  createAuthWindow,
  createMainWindow,
  urls,
} = require('./windows');

const CaptchaWindowManager = require('./captchaWindowManager');

nebulaEnv.setUpEnvironment();

// const _UPDATE_EVENT_KEY = 'UpdateEventKey';

/**
 * Manage the window.
 */
class WindowManager {
  get main() {
    return this._main;
  }

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

    this._splash = null;

    this._shouldUpdate = false;
    this._isUpdating = false;

    /**
     * Separate manager to handle captcha windows
     */
    this._captchaWindowManager = new CaptchaWindowManager(context);

    /**
     * IPC Function Definitions
     */
    // context.ipc.on(IPCKeys.RequestCheckForUpdate, this._onRequestCheckForUpdates.bind(this));
    context.ipc.on(IPCKeys.RequestCreateNewWindow, this._onRequestCreateNewWindow.bind(this));
    context.ipc.on(IPCKeys.RequestSendMessage, this._onRequestSendMessage.bind(this));
    context.ipc.on(IPCKeys.RequestGetWindowIDs, this._onRequestGetWindowIDs.bind(this));
    context.ipc.on(IPCKeys.RequestCloseWindow, this._onRequestWindowClose.bind(this));
    context.ipc.on(
      IPCKeys.RequestMinimizeWindow,
      WindowManager._onRequestWindowMinimize.bind(this),
    );
    context.ipc.on(IPCKeys.ChangeTheme, this.onChangeTheme.bind(this));

    autoUpdater.logger = log;
    // autoUpdater.logger.transports.file.level = 'debug';
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.checkForUpdates();

    // attach event listeners
    autoUpdater.on('checking-for-update', () => {
      log.info('CHECKING FOR UPDATE');
      // if (this._main) {
      //   this._main.webContents.send(IPCKeys.RequestCheckForUpdate);
      // }
    });

    autoUpdater.on('update-available', info => {
      log.info('UPDATE AVAILABLE: ', info);
      const { version, releaseNotes } = info;
      Electron.dialog.showMessageBox(
        {
          type: 'question',
          title: `Nebula ${version} is now live! Update now?`,
          message: releaseNotes,
          buttons: ['Update Now', 'Update Later'],
          cancelId: 1,
          defaultId: 0,
        },
        response => {
          if (response === 0) {
            this._shouldUpdate = true;
          }
        },
      );
    });

    autoUpdater.on('update-not-available', info => {
      log.info('UPDATE NOT AVAILABLE: ', info);
      // if (this._main) {
      //   this._main.webContents.send(IPCKeys.RequestCheckForUpdate, { done: true });
      // }
    });

    autoUpdater.on('error', error => {
      log.info('ERROR: ', error);
      // if (this._main) {
      //   this._main.webContents.send(IPCKeys.RequestCheckForUpdate, { done: true, error });
      // }
    });

    autoUpdater.on('download-progress', progressObj => {
      log.info('DOWNLOADING: ', progressObj.bytesPerSecond);
      // if (this._main) {
      //   this._main.webContents.send(IPCKeys.RequestCheckForUpdate, { progressObj });
      // }
    });

    autoUpdater.on('update-downloaded', async info => {
      log.info('NEW UPDATE DOWNLOADED: ', info);
      if (this._shouldUpdate) {
        // if (this._main) {
        //   this._main.webContents.send(IPCKeys.RequestCheckForUpdate, { done: true });
        // }
        autoUpdater.quitAndInstall();
      }
    });
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

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    if (session || ['auth', 'about', 'splash'].includes(tag)) {
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
        case 'splash': {
          if (this._splash) {
            return this._splash;
          }
          w = createSplashWindow();
          this._splash = w;
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
    return async () => {
      // open dev tools if dev env
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        console.log(`Window was opened, id = ${win.id}`);
        win.webContents.toggleDevTools();
      }
      // add window & id to windows map, notify other windows, and finally, show the window
      this._windows.set(win.id, win);
      this._notifyUpdateWindowIDs(win.id);
      win.show();

      if (win === this._main || win === this._auth) {
        if (this._splash) {
          console.log('Destroying splash page!');
          this._windows.delete(this._splash.id);
          this._splash.destroy();
          this._splash = null;
        }
      }

      if (win === this._main) {
        log.info('Starting update check...');
        autoUpdater.checkForUpdatesAndNotify();
        // generate captcha window sessions
        this._captchaWindowManager.generateSessions();
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
    return async () => {
      if (nebulaEnv.isDevelopment()) {
        console.log(`Window was closed, id = ${winId}`);
      }
      this._windows.delete(winId);
      this._notifyUpdateWindowIDs(winId);

      if (this._aboutDialog && winId === this._aboutDialog.id) {
        this._aboutDialog = null;
      } else if (this._main && winId === this._main.id) {
        // Stop the task launcher when the main window closes
        this._context.taskLauncher.stop();
        Electron.BrowserWindow.getAllWindows(w => w.close());
        this._main = null;
      } else if (this._auth && winId === this._auth.id) {
        this._auth = null;
      } else if (this._splash && winId === this._splash.id) {
        this._windows.delete(winId);
        this._splash.destroy();
        this._splash = null;
      }
    };
  }

  /**
   * Function to handle the transition between main -> auth window
   */
  async transitionToDeauthedState() {
    // Auth window is already open, no need to open it again
    if (this._auth) {
      return this._auth;
    }

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
    console.log('transitioning to authed state!');
    // Main window is already open, no need to open it again
    if (this._main) {
      return this._main;
    }

    this._splash = await createSplashWindow();

    if (this._auth) {
      this._windows.delete(this._auth.id);
      this._auth.destroy();
      this._auth = null;
    }

    const splashUrl = urls.get('splash');
    this._splash.loadURL(splashUrl);

    await setTimeout(async () => {
      // create the main window
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
    }, 3000);
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

  static _onRequestWindowMinimize() {
    Electron.BrowserWindow.getFocusedWindow().minimize();
  }

  /**
   * Start Harvesting Captchas for a specific task
   *
   * Forward call to Captcha Window Manager
   */
  startHarvestingCaptcha(runnerId, siteKey, host) {
    this._captchaWindowManager.startHarvesting(runnerId, siteKey, host);
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

  /**
   * Change Theme
   *
   * Adjust the window theme
   */
  onChangeTheme(_, opts) {
    // For now we only need to worry about the captcha windows, so defer to the captcha window manager
    this._captchaWindowManager.changeTheme(opts);
  }
}

module.exports = WindowManager;
