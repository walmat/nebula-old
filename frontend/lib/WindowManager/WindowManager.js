const Electron = require('electron');
const Path = require('path');

const IPCKeys = require('../common/Constants');
const nebulaAuth = require('../_electron/auth');

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

    context.ipc.on(IPCKeys.RequestCreateNewWindow, this._onRequestCreateNewWindow.bind(this));
    context.ipc.on(IPCKeys.RequestSendMessage, this._onRequestSendMessage.bind(this));
    context.ipc.on(IPCKeys.RequestGetWindowIDs, this._onRequestGetWindowIDs.bind(this));
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

    const session = await nebulaAuth.getSession();

    switch (tag) {
      case 'about': {
        if (this._aboutDialog) {
          return;
        }
        w = new Electron.BrowserWindow({
          width: 300,
          height: 256,
          resizable: false,
          alwaysOnTop: true,
        });
        winUrl = `file:///${Path.join(__dirname, '../../build/about.html')}`;
        break;
      }
      case 'auth': {
        w = new Electron.BrowserWindow({
          width: 300,
          height: 215,
          center: true,
          frame: false,
          fullscreenable: false,
          movable: true,
          resizable: false,
          show: false,
          webPreferences: {
            nodeIntegration: false,
            preload: Path.join(__dirname, '../_electron/preload.js'),
            webSecurity: true,
          },
        });
        winUrl = `file:///${Path.join(__dirname, '../../build/auth.html')}`;
        break;
      }
      case 'main': {
        w = new Electron.BrowserWindow({
          width: 1000,
          height: 715,
          center: true,
          frame: false,
          fullscreenable: false,
          movable: true,
          resizable: false,
          show: false,
          webPreferences: {
            nodeIntegration: false,
            preload: Path.join(__dirname, '../_electron/preload.js'),
            webSecurity: true,
          },
        });
        winUrl = process.env.NEBULA_START_URL || `file:///${Path.join(__dirname, '../../build/index.html')}`;
        break;
      }
      case 'youtube': {
        w = new Electron.BrowserWindow({
          width: 450,
          height: 475,
          center: true,
          frame: false,
          fullscreenable: false,
          movable: true,
          resizable: false,
          show: false,
          webPreferences: {
            nodeIntegration: false,
            preload: Path.join(__dirname, '../_electron/preload.js'),
            webSecurity: true,
          },
        });
        winUrl = 'https://accounts.google.com/signin/v2/identifier?hl=en&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Ffeature%3Dsign_in_button%26hl%3Den%26app%3Ddesktop%26next%3D%252F%26action_handle_signin%3Dtrue&passive=true&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin';
        break;
      }
      case 'captcha': {
        w = new Electron.BrowserWindow({
          width: 415,
          height: 350,
          center: true,
          frame: false,
          fullscreenable: false,
          movable: true,
          resizable: false,
          show: false,
          webPreferences: {
            nodeIntegration: false,
            preload: Path.join(__dirname, '../_electron/preload.js'),
            webSecurity: true,
          },
        });
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
    return w;
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
}

module.exports = WindowManager;
