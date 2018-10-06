const Electron = require('electron');
const DialogManager = require('./DialogManager');
const WindowManager = require('./WindowManager');
const AuthManager = require('./AuthManager');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

// Install Dev tools extensions
const { default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = require('electron-devtools-installer');

/**
 * Application entry point.
 */
class App {
  /**
   * Initialize instance.
   */
  constructor() {
    // Compile switch
    if (nebulaEnv.isDevelopment()) {
      console.log('Initialize Application');
    }

    /**
     * IPC module for main process.
     * @type {ipcMain}
     */
    this._ipc = Electron.ipcMain;

    /**
     * The shell module provides functions related to desktop integration.
     * @type {shell}
     */
    this._shell = Electron.shell;

    /**
     * Manage the window.
     * @type {WindowManager}
     */
    this._windowManager = new WindowManager(this);

    /**
     * Manage the native dialog.
     * @type {DialogManager}
     */
    this._dialogManager = new DialogManager(this);

    /**
     * Manage the auth workflow
     * @type {AuthManager}
     */
    this._authManager = new AuthManager(this);
  }

  /**
   * Get the IPC module.
   * @return {ipcMain} IPC module.
   */
  get ipc() {
    return this._ipc;
  }

  /**
   * Get the shell module.
   * @return {shell} IPC module.
   */
  get shell() {
    return this._shell;
  }

  /**
   * Get the window manager.
   *
   * @return {WindowManager} Instance of the window manager.
   */
  get windowManager() {
    return this._windowManager;
  }

  /**
   * Get the window manager.
   *
   * @return {WindowManager} Instance of the window manager.
   */
  get authManager() {
    return this._authManager;
  }

  /**
   * Occurs when a application launched.
   */
  async onReady() {

    if (nebulaEnv.isDevelopment()) {
      await App.installExtensions();
    }

    await this._windowManager.createNewWindow('main');
  }

  /**
   * Occurs when a window all closed.
   */
  onWindowAllClosed() {
    if (nebulaEnv.isDevelopment()) {
      console.log('Quit');
    }

    Electron.app.quit();
  }

  static async installExtensions() {
    const devExts = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];

    await Promise.all(devExts.map(ext => installExtension(ext)
      .then(name => console.log(`Added Extension: ${name}`))
      .catch(err => console.error(`An Error Occurred: ${err}`))));
  }
}

module.exports = App;
