const Electron = require('electron');
const MainMenu = require('./MainMenu');
const DialogManager = require('./DialogManager');
const WindowManager = require('./WindowManager');
const AuthManager = require('../_electron/AuthManager');
const nebulaEnv = require('../_electron/env');

nebulaEnv.setUpEnvironment();
const isDevelopment = process.env.NEBULA_ENV === 'development';

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
    if (isDevelopment) {
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

    if (isDevelopment) {
      await App.installExtensions();
    }

    let win;
    const session = await this._authManager.getSession();

    if (!session || (session && session.errors)) {
      win = await this._windowManager.createNewWindow('auth');
    } else {
      win = await this._windowManager.createNewWindow('main');
    }
    const menu = Electron.Menu.buildFromTemplate(MainMenu.menu(this));
    Electron.Menu.setApplicationMenu(menu);

    win.on('ready-to-show', () => {
      if (isDevelopment || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        win.webContents.openDevTools();
      }
      win.show();
    });
  }

  /**
   * Occurs when a window all closed.
   */
  onWindowAllClosed() {
    if (isDevelopment) {
      console.log('Quit');
    }

    Electron.app.quit();
  }

  static async installExtensions() {
    const devExts = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];

    await Promise.all(devExts.map(ext => installExtension(ext)
      .then(name => console.log(`Added Extension: ${name}`))
      .catch(err => console.error(`An Error Occurred: ${err}`))));
  };
}

const app = new App();
Electron.app.on('ready', () => {
  if (isDevelopment) {
    console.log('Application is ready');
  }

  app.onReady();
});

Electron.app.on('quit', () => {
  if (isDevelopment) {
    console.log('Application is quitting');
  }
});

Electron.app.on('window-all-closed', () => {
  if (isDevelopment) {
    console.log('All of the window was closed.');
  }

  app.onWindowAllClosed();
});
