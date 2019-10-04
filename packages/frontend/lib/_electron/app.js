/* eslint-disable import/no-extraneous-dependencies */
const Electron = require('electron');
const fetch = require('node-fetch');
const RPC = require('./rpc');
const CaptchaServerManager = require('./captchaServerManager');
const MainMenu = require('./mainMenu');
const SecurityManager = require('./securityManager');
const DialogManager = require('./dialogManager');
const WindowManager = require('./windowManager');
const AuthManager = require('./authManager');
const TaskLauncher = require('../task/launcher');
const nebulaEnv = require('./env');
const { bindDebugEvents } = require('./debug');

nebulaEnv.setUpEnvironment();

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
     * Manage the captcha server
     * @type {CaptchaServerManager}
     */
    this._captchaServerManager = new CaptchaServerManager(this);

    this.onCertificateErrorHandler = this.onCertificateErrorHandler.bind(this);

    /**
     * Debug call to see if app was initialized..
     */
    if (nebulaEnv.isDevelopment()) {
      console.log('Initialize Application');
      bindDebugEvents(this);
    }

    this._rpcInterval = null;
    this._authInterval = null;
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
   * Get the captcha server manager.
   *
   * @return {CaptchaServerManager} Instance of the captcha server manager
   */
  get captchaServerManager() {
    return this._captchaServerManager;
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

    const session = await this._authManager.getSession();

    // create splash page if not in dev mode
    if (session && !nebulaEnv.isDevelopment()) {
      await this._windowManager.createNewWindow('splash');

      try {
        await fetch(`${process.env.NEBULA_API_URL}/auth/active`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        console.log('Unable to set active user!');
        // fail silently...
      }

      // set a timeout to check for a valid user entry in the db
      this._authInterval = setInterval(async () => {
        try {
          const res = await fetch(`${process.env.NEBULA_API_URL}/auth`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!res.ok) {
            const error = new Error('Invalid response!');
            error.status = res.status;
            throw error;
          }
        } catch (error) {
          await this._authManager.clearSession();
          this.onWindowAllClosed();
        }
      }, 5000);
    }

    // security check for http loggers
    if (!nebulaEnv.isDevelopment()) {
      // attach an interval to check for any logging applications
      this._loggerInterval = setInterval(async () => {
        const isRunning = await this._securityManager.isHTTPLoggerRunning();
        if (isRunning) {
          this.onWindowAllClosed();
        }
      }, 1500);
    }

    // discord Rich Presence API
    this._rpc.client.on('ready', () => {
      this._rpc.setActivity().catch(console.error);
      this._rpcInterval = setInterval(() => this._rpc.setActivity().catch(console.error), 15e3);
    });

    // if we're in dev mode, don't wait for splash page buffer
    if (nebulaEnv.isDevelopment()) {
      // create the main window
      await this._windowManager.createNewWindow('main');
      // set the menu
      const menu = Electron.Menu.buildFromTemplate(MainMenu.menu(this));
      Electron.Menu.setApplicationMenu(menu);
      return;
    }

    // wait 3 seconds to start the main window (for splash page buffering)
    setTimeout(async () => {
      // create the window
      await this._windowManager.createNewWindow('main');
      // set the menu
      const menu = Electron.Menu.buildFromTemplate(MainMenu.menu(this));
      Electron.Menu.setApplicationMenu(menu);
    }, 3000);
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
    clearInterval(this._authInterval);
    this._rpcInterval = null;
    this._loggerInterval = null;
    this._authInterval = null;

    const session = await this._authManager.getSession();
    if (session && !nebulaEnv.isDevelopment()) {
      try {
        await fetch(`${process.env.NEBULA_API_URL}/auth/active`, {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        console.log('Unable to delete active user!');
        // fail silently...
      }
    }
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

  onCertificateErrorHandler(event, webContents, url, error, certificate, callback) {
    const serverPort = this._captchaServerManager.port;
    if (serverPort && url.startsWith(`https://127.0.0.1:${serverPort}`)) {
      event.preventDefault();
      callback(true);
    } else {
      event.preventDefault();
      callback(false);
    }
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
