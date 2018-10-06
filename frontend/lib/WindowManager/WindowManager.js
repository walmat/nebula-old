import Electron from 'electron';
import Path from 'path';
import { IPCKeys } from '../common/Constants';

/**
 * Manage the window.
 */
export default class WindowManager {
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
   * Create a new window.
   *
   * @return {BrowserWindow} Created window.
   */
  createNewWindow() {
    const w = new Electron.BrowserWindow({
      width: 400,
      height: 400,
      minWidth: 400,
      minHeight: 400,
      resizable: true,
    });

    const { id } = w.id;

    w.on('closed', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Window was closed, id = ${id}`);
      }

      // Unregister
      this._windows.delete(id);
      this._notifyUpdateWindowIDs(id);

      if (this._windows.size === 0 && this._aboutDialog) {
        this._aboutDialog.close();
      }
    });

    // `win.loadFile` will escape `#` to `%23`, So use `win.loadURL`
    const filePath = Path.join(__dirname, 'index.html');
    w.loadURL(`file://${filePath}#${id}`);
    this._windows.set(id, w);

    return w;
  }

  /**
   * Show the about application window.
   */
  createAboutWindow() {
    if (this._aboutDialog) {
      return;
    }

    const w = new Electron.BrowserWindow({
      width: 400,
      height: 256,
      resizable: false,
      alwaysOnTop: true,
    });

    w.setMenu(null);

    w.on('closed', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('The about application window was closed.');
      }

      this._aboutDialog = null;
    });

    w.loadFile('assets/about.html');
    this._aboutDialog = w;
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
  _onRequestCreateNewWindow(ev) {
    const createdWindow = this.createNewWindow();
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
