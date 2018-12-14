const Electron = require('electron');
const CaptchaServerManager = require('./captchaServerManager');
const MainMenu = require('./mainMenu');
const DialogManager = require('./dialogManager');
const WindowManager = require('./windowManager');
const AppSetup = require('./appSetup');
const AuthManager = require('./authManager');
const TaskManagerWrapper = require('./taskManagerWrapper');
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

    /**
     * Manage the native dialog.
     * @type {DialogManager}
     */
    this._dialogManager = new DialogManager(this);

    this._appSetup = new AppSetup(this);

    /**
     * Manage the auth workflow
     * @type {AuthManager}
     */
    this._authManager = new AuthManager(this);

    /**
     * Wrapper for the TaskManager
     * @type {TaskManagerWrapper}
     */
    this._taskManagerWrapper = new TaskManagerWrapper(this);

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
   * Get the app setup.
   *
   * @return {AppSetup} Instance of the app setup manager.
   */
  get appSetup() {
    return this._appSetup;
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
   * Occurs when a application launched.
   */
  async onReady() {
    if (nebulaEnv.isDevelopment()) {
      await App.installExtensions();
    }

    await this._windowManager.createNewWindow('main');
    const menu = Electron.Menu.buildFromTemplate(MainMenu.menu(this));
    Electron.Menu.setApplicationMenu(menu);
  }

  /**
   * Event triggered when all BrowserWindow objects are closed.
   */
  onWindowAllClosed() {
    if (nebulaEnv.isDevelopment()) {
      console.log('Quit');
    }

    Electron.app.quit();
  }

  onCertificateErrorHandler(
    event,
    webContents,
    url,
    error,
    certificate,
    callback,
  ) {
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
    } = require('electron-devtools-installer');
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
