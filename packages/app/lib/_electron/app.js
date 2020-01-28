/* eslint-disable import/no-extraneous-dependencies */
const Electron = require('electron');
const RPC = require('./rpc');
const MainMenu = require('./mainMenu');
const SecurityManager = require('./securityManager');
const DialogManager = require('./dialogManager');
const WindowManager = require('./windowManager');
const AuthManager = require('./authManager');
const TaskLauncher = require('../task/launcher');
const nebulaEnv = require('./env');
const { bindDebugEvents } = require('./debug');

nebulaEnv.setUpEnvironment();

Error.stackTraceLimit = 100; // https://v8.dev/docs/stack-trace-api
require('v8-compile-cache');

/**
 * Application entry point.
 */
class App {
  /**
   * Initialize instance.
   */
  constructor() {
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
     * The application's session storage
     * @type {session}
     */
    this._session = Electron.session;

    /**
     * Manage the window.
     * @type {WindowManager}
     */
    this._windowManager = new WindowManager(this);

    this._securityManager = new SecurityManager(this);

    this._rpc = new RPC(this);

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

    /**
     * Wrapper for task management
     * @type {TaskLauncher}
     */
    this._taskLauncher = new TaskLauncher(this);

    /**
     * Debug call to see if app was initialized..
     */
    if (nebulaEnv.isDevelopment()) {
      console.log('Initialize Application');
      bindDebugEvents(this);
    }

    this._rpcInterval = null;
    this._loggerInterval = null;
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
   * Get the session module.
   * @return {session} Application session
   */
  get session() {
    return this._session;
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
   * Get the auth manager.
   *
   * @return {AuthManager} Instance of the auth manager.
   */
  get authManager() {
    return this._authManager;
  }

  /**
   * Get the task wrapper
   *
   * @return {TaskLauncher} Instance of the task wrapper
   */
  get taskLauncher() {
    return this._taskLauncher;
  }

  /**
   * Occurs when a application launched.
   */
  async onReady() {
    if (nebulaEnv.isDevelopment()) {
      await App.installExtensions();
    }

    // Security check for http loggers
    if (!nebulaEnv.isDevelopment()) {
      // attach an interval to check for any logging applications
      this._loggerInterval = setInterval(async () => {
        const isRunning = await this._securityManager.isHTTPLoggerRunning();
        if (isRunning) {
          await this.onWindowAllClosed();
        }
      }, 1500);
    }

    // Create the main window
    await this._windowManager.createNewWindow('main');

    // Apply the menu
    const menu = Electron.Menu.buildFromTemplate(MainMenu.menu(this));
    Electron.Menu.setApplicationMenu(menu);

    // Discord Rich Presence
    this._rpc.client.on('ready', () => {
      this._rpc.setActivity().catch(console.error);
      this._rpcInterval = setInterval(() => this._rpc.setActivity().catch(console.error), 15e3);
    });
  }

  /**
   * Occurs right before application quit
   */
  async onBeforeQuit() {
    // Perform any cleanup that needs to get done
    if (nebulaEnv.isDevelopment()) {
      console.log('cleaning up tasks...');
    }
    clearInterval(this._rpcInterval);
    clearInterval(this._loggerInterval);
    this._rpcInterval = null;
    this._loggerInterval = null;
  }

  /**
   * Event triggered when all BrowserWindow objects are closed.
   */
  async onWindowAllClosed() {
    if (nebulaEnv.isDevelopment()) {
      console.log('Quit');
    }

    await this.onBeforeQuit();
    Electron.app.quit();
  }

  /**
   * Install development extensions
   */
  static async installExtensions() {
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
      REDUX_DEVTOOLS,
      // eslint-disable-next-line global-require
    } = require('electron-devtools-installer'); // dev only require
    const devExts = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];
    await Promise.all(
      devExts.map(ext =>
        installExtension(ext)
          .then(name => console.log(`Added Extension: ${name}`))
          .catch(err => console.error(`An Error Occurred: ${err}`)),
      ),
    );
  }
}

module.exports = App;
