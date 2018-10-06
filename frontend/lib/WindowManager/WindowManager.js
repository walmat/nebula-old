const Electron = require('electron');
const Path = require('path');

const IPCKeys = require('../common/Constants');
const {
  createAboutWindow,
  createAuthWindow,
  createCaptchaWindow,
  createMainWindow,
  createYouTubeWindow,
} = require('./Windows');

const isDevelopment = process.env.NEBULA_ENV === 'development';

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

    context.ipc.on(IPCKeys.RequestCreateNewWindow, this._onRequestCreateNewWindow.bind(this));
    context.ipc.on(IPCKeys.RequestSendMessage, this._onRequestSendMessage.bind(this));
    context.ipc.on(IPCKeys.RequestGetWindowIDs, this._onRequestGetWindowIDs.bind(this));
    context.ipc.on(IPCKeys.RequestCloseWindow, this._onRequestWindowClose.bind(this));
    context.ipc.on(IPCKeys.RequestLaunchHarvester, this._onRequestLaunchHarvester.bind(this));
    context.ipc.on(IPCKeys.RequestLaunchYoutube, this._onRequestLaunchYoutube.bind(this));
  }

  /**
   * Reload the focused window, For debug.
   */
  static reload() {
    const w = Electron.BrowserWindow.getFocusedWindow();
    if (w) {
      w.reload();
    }
  }

  /**
   * Switch the display of the developer tools window at focused window, For debug.
   */
  static toggleDevTools() {
    const w = Electron.BrowserWindow.getFocusedWindow();
    if (w) {
      w.toggleDevTools();
    }
  }

  /**
   * Create the main application window.
   *
   * @return {BrowserWindow} Created window.
   */
  async createNewWindow(tag) {
    let w;
    let winUrl;

    const session = await this._context._authManager.getSession();

    console.log(`[DEBUG]: ${session}`);

    if (session || ['auth', 'about'].includes(tag)) {
      switch (tag) {
        case 'about': {
          if (this._aboutDialog) {
            return this._aboutDialog;
          }
          w = await createAboutWindow();
          winUrl = `file:///${Path.join(__dirname, '../../build/about.html')}`;
          this._aboutDialog = w;
          break;
        }
        case 'auth': {
          if (this._auth) {
            return this._auth;
          }
          w = await createAuthWindow();
          winUrl = `file:///${Path.join(__dirname, '../../build/auth.html')}`;
          this._auth = w;
          break;
        }
        case 'main': {
          if (this._main) {
            return this._main;
          }
          w = await createMainWindow();
          winUrl = process.env.NEBULA_START_URL || `file:///${Path.join(__dirname, '../../build/index.html')}`;
          this._main = w;
          break;
        }
        case 'youtube': {
          w = await createYouTubeWindow();
          winUrl = 'https://accounts.google.com/signin/v2/identifier?hl=en&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Ffeature%3Dsign_in_button%26hl%3Den%26app%3Ddesktop%26next%3D%252F%26action_handle_signin%3Dtrue&passive=true&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin';
          break;
        }
        case 'captcha': {
          w = await createCaptchaWindow();
          winUrl = `file:///${Path.join(__dirname, '../../build/captcha.html')}`;
          break;
        }
        default: break;
      }

      w.loadURL(winUrl);
      const { id } = w;
      this._windows.set(id, w);

      w.on('closed', () => {
        if (isDevelopment) {
          console.log(`Window was closed, id = ${id}`);
        }

        // Unregister
        this._windows.delete(id);
        this._notifyUpdateWindowIDs(id);

        if (this._windows.size === 0 && this._aboutDialog) {
          this._aboutDialog.close();
        }
      });

      w.on('ready-to-show', () => {
        if (isDevelopment || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
          w.webContents.openDevTools();
        }
        w.show();
      });

      return w;
    }
    return this.transitionToDeauthedState();
  }

  async transitionToDeauthedState() {
    this._auth = await createAuthWindow();
    const winUrl = `file:///${Path.join(__dirname, '../../build/auth.html')}`;
    this._auth.loadURL(winUrl);
    const { id } = this._auth;
    this._windows.set(id, this._auth);

    this._auth.on('ready-to-show', () => {
      if (isDevelopment || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        this._auth.webContents.openDevTools();
      }
      this._auth.show();
    });

    this._windows.forEach(w => w.id !== this._auth.id && w.close());
    return this._auth;
  }

  async transitiontoAuthedState() {
    this._main = await createMainWindow();
    const winUrl = process.env.NEBULA_START_URL || `file:///${Path.join(__dirname, '../../build/index.html')}`;
    this._main.loadURL(winUrl);
    const { id } = this._main;
    this._windows.set(id, this._main);

    this._main.on('ready-to-show', () => {
      if (isDevelopment || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        this._main.webContents.openDevTools();
      }
      this._main.show();
    });

    this._windows.forEach(w => w.id !== this._main.id && w.close());
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
        win.close();
      });
    } else {
      // just close the one window
      w.close();
    }
  }

  /**
   * Occurs when the main window sends the RequestLaunchHarvester event 
   * @param {IPCEvent} ev Event data.
   */
  _onRequestLaunchHarvester(ev) {
    this.createNewWindow('captcha');
  }

  /**
   * Occurs when the main window sends the RequestLaunchHarvester event 
   * @param {IPCEvent} ev Event data.
   */
  _onRequestLaunchYoutube(ev) {
    this.createNewWindow('youtube');
  }
}

module.exports = WindowManager;
