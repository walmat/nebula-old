const Electron = require('electron');
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

    // TEMPORARY
    if (nebulaEnv.isDevelopment()) {
      context.ipc.on(
        'debug',
        (ev, type) => {
          if (type === 'testStartHarvest') {
            this.onRequestStartHarvestingCaptcha(1);
          } else if (type === 'testStopHarvest') {
            this.onRequestStopHarvestingCaptcha(1);
          }
        },
      );
    }
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
          break;
        }
        case 'captcha': {
          if (this._captchas.size < 5) {
            let serverPort = this._context.captchaServerManager.port;
            if (!this._context.captchaServerManager.isRunning) {
              console.log('[DEBUG]: Starting captcha server...');
              this._context.captchaServerManager.start();
              // TODO: Change to use destructuring?
              // (Might have to add a public getter to CSM)
              serverPort = this._context.captchaServerManager.port;
            }
            w = await createCaptchaWindow();
            this._captchas.set(w.id, new CaptchaWindowManager(this._context, w, this._context._session.fromPartition(`${w.id}`)));
            console.log(`size after creating: ${this._captchas.size}`);
            console.log(`[DEBUG]: Loading captcha with url: http://127.0.0.1:${serverPort}/captcha.html`);
            w.loadURL(`http://127.0.0.1:${serverPort}/captcha.html`);
          }
          break;
        }
        case 'youtube': {
          w = await createYouTubeWindow();
          break;
        }
        default: break;
      }

      if (tag !== 'captcha') {
        w.loadURL(urls.get(tag));
      }

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
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        console.log(`Window was opened, id = ${win.id}`);
        win.webContents.openDevTools();
      }
      this._windows.set(win.id, win);
      this._notifyUpdateWindowIDs(win.id);
      win.show();
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

      if (this._windows.size === 0 && this._aboutDialog) {
        this._aboutDialog.close();
      }

      if (this._main && win.id === this._main.id) {
        this._main = null;
      } else if (this._auth && win.id === this._auth.id) {
        this._auth = null;
      } else if (this._captchas.size > 0) {
        this._captchas.forEach((captchaWindowManager) => {
          if (win.id === captchaWindowManager._captchaWindow.id) {
            // deregister the interval from the captcha window
            WindowManager.handleCloseCaptcha(this._captchas.get(win.id));
            this._captchas.delete(win.id);
          } else if (win.id === captchaWindowManager._youtubeWindow.id) {
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

    this._windows.forEach((w) => {
      if (w.id !== this._auth.id) {
        w.close();
      }
    });
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

    this._windows.forEach((w) => {
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
    for (const key of this._windows.keys()) {
      windowIDs.push(key);
    }

    this._windows.forEach((w) => {
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
    if (this._main && (this._main.id === id)) {
      // close all windows
      this._windows.forEach((w) => {
        w.close();
      });
    } else if (this._auth && (this._auth.id === id)) {
      this._windows.forEach((w) => {
        w.close();
      });
    } else if (this._captchas.size > 0) {
      this._captchas.forEach((w) => {
        if (id === w._captchaWindow.id) {
          w._captchaWindow.close();
          if (w._youtubeWindow) {
            w._youtubeWindow.close();
          }
        }
      });
    }
  }

  /**
   * Request to close all open captcha windows
   * @param {EventEmitter} ev - close event
   * BUG: closes one at a time..
   */
  _onRequestCloseAllCaptchaWindows(ev) {
    if (this._captchas.size > 0) {
      this._captchas.forEach((captchaWindowManager) => {
        captchaWindowManager._captchaWindow.close();
        if (captchaWindowManager._youtubeWindow) {
          captchaWindowManager._youtubeWindow.close();
        }
      });
    }
  }

  /**
   * [Re]allocate captcha windows for harvesting specific tasks
   *
   * This method should be used when _adding_ a new task to the pool.
   * // TODO: Research if this needs to exist!
   * // TODO: This should be moved to CaptchaWindowManager when issue #97 gets tackled
   * // https://github.com/walmat/nebula/issues/97
   */
  allocateCaptchaWindowsForTask(runnerId) {
    // TODO: Implement
  }

  /**
   * (Re|De)allocate captcha windows for harvesting specific tasks
   *
   * This methods should be used when _removing_ a task from the pool
   * // TODO: Research if this needs to exist!
   * // TODO: This should be moved to CaptchaWindowManager when issue #97 gets tackled
   * // https://github.com/walmat/nebula/issues/97
   */
  deallocateCaptchaWindowsForTask(runnerId) {
    // TODO: Implement
  }

  /**
   * Start Harvesting Captchas for a specific task
   * // TODO This should be moved to CaptchaWindowManager when issue #97 gets tackled
   * // https://github.com/walmat/nebula/issues/97
   */
  onRequestStartHarvestingCaptcha(runnerId) {
    if (this._captchas.size > 0) {
      this._captchas.forEach((captchaWindowManager) => {
        captchaWindowManager.startHarvestingCaptcha(runnerId);
      });
    }
  }

  /**
   * Stop Harvesting Captchas for a specific task
   * // TODO This should be moved to CaptchaWindowManager when issue #97 gets tackled
   * // https://github.com/walmat/nebula/issues/97
   */
  onRequestStopHarvestingCaptcha(runnerId) {
    if (this._captchas.size > 0) {
      this._captchas.forEach((captchaWindowManager) => {
        captchaWindowManager.stopHarvestingCaptcha(runnerId);
      });
    }
  }
}

module.exports = WindowManager;
