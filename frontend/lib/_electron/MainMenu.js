const Electron = require('electron');
const nebulaEnv = require('./env');

const APP_NAME = 'Nebula';
const HELP_URL = 'https://nebulabots.com/about';

/**
 * Main menu.
 */
class MainMenu {
  /**
   * Create menu.
   *
   * @param {App} context Application instance.
   *
   * @return {Object[]} Menu.
   */
  static menu(context) {
    const templates = [
      MainMenu._menuView(),
      MainMenu._menuWindow(),
      MainMenu._menuHelp(),
    ];

    if (process.platform === 'darwin') {
      templates.unshift(MainMenu._menuApp(context));
    }

    return templates;
  }

  /**
   * Create a menu of Application ( OS X only ).
   *
   * @return {Object} Menu data.
   */
  static _menuApp(context) {
    return {
      label: APP_NAME,
      submenu: [
        {
          label: `About ${APP_NAME}`,
          click: () => {
            context.windowManager.createAboutWindow();
          },
        },
        {
          type: 'separator',
        },
        {
          label: `Hide ${APP_NAME}`,
          accelerator: 'Command+H',
          role: 'hide',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Alt+H',
          role: 'hideothers',
        },
        {
          label: 'Show All',
          role: 'unhide',
        },
        {
          type: 'separator',
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => { Electron.app.quit(); },
        },
      ],
    };
  }

  /**
   * Create a menu of View.
   *
   * @return {Object} Menu data.
   */
  static _menuView() {
    if (nebulaEnv.isDevelopment()) {
      const templates = {
        label: 'View',
        submenu: [
        ],
      };
      templates.submenu.unshift({
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            focusedWindow.reload();
          }
        },
      });

      templates.submenu.push({
        label: 'Toggle Developer Tools',
        accelerator: (() => (process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I'))(),
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            focusedWindow.toggleDevTools();
          }
        },
      });
      return templates;
    }
    return null;
  }

  /**
   * Create a menu of Window.
   *
   * @return {Object} Menu data.
   */
  static _menuWindow() {
    const templates = {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
      ],
    };

    if (process.platform === 'darwin') {
      templates.submenu.push({
        type: 'separator',
      });

      templates.submenu.push({
        label: 'Bring All to Front',
        role: 'front',
      });
    }

    return templates;
  }

  /**
   * Create a menu of Help.
   *
   * @return {Object} Menu data.
   */
  static _menuHelp() {
    return {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: () => {
            Electron.shell.openExternal(HELP_URL);
          },
        },
      ],
    };
  }
}

module.exports = MainMenu;

