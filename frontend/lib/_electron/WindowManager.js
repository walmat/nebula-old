const Electron = require('electron');
const IPCKeys = require('../common/Constants');
const nebulaEnv = require('./env');
const {
  createAboutWindow,
  createAuthWindow,
  createCaptchaWindow,
  createMainWindow,
  createYouTubeWindow,
  urls,
} = require('./Windows');


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
     * IPC Function Definitions
     */
    context.ipc.on(IPCKeys.RequestCreateNewWindow, this._onRequestCreateNewWindow.bind(this));
    context.ipc.on(IPCKeys.RequestSendMessage, this._onRequestSendMessage.bind(this));
    context.ipc.on(IPCKeys.RequestGetWindowIDs, this._onRequestGetWindowIDs.bind(this));
    context.ipc.on(IPCKeys.RequestCloseWindow, this._onRequestWindowClose.bind(this));
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
        case 'youtube': {
          w = await createYouTubeWindow();
          break;
        }
        case 'captcha': {
          w = await createCaptchaWindow();
          break;
        }
        default: break;
      }

      w.loadURL(urls.get(tag));
      const { id } = w;
      this._windows.set(id, w);

      w.on('ready-to-show', WindowManager.handleShow(w));

      w.on('close', this.handleClose(w));

      return w;
    }
    return this.transitionToDeauthedState();
  }

  static handleShow(win) {
    return () => {
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        win.webContents.openDevTools();
      }
      win.show();
    };
  }

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
    };
  }

  async transitionToDeauthedState() {
    this._auth = await createAuthWindow();
    const winUrl = urls.get('auth');
    this._auth.loadURL(winUrl);
    const { id } = this._auth;
    this._windows.set(id, this._auth);

    this._auth.on('ready-to-show', WindowManager.handleShow(this._auth));

    this._auth.on('close', this.handleClose(this._auth));

    this._windows.forEach((w) => {
      if (w.id !== this._auth.id) {
        w.close();
      }
    });
    return this._auth;
  }

  async transitiontoAuthedState() {
    this._main = await createMainWindow();
    const winUrl = urls.get('main');
    this._main.loadURL(winUrl);
    const { id } = this._main;
    this._windows.set(id, this._main);

    this._main.on('ready-to-show', WindowManager.handleShow(this._main));

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
    const w = this._windows.get(id);
    if (this._main && (this._main.id === id)) {
      // close all windows
      this._windows.forEach((win) => {
        this.handleClose(win)();
        win.close();
      });
    } else {
      // just close the one window object
      this.handleClose(w)();
      w.close();
    }
  }
}

module.exports = WindowManager;
