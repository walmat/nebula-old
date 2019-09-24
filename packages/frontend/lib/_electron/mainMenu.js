// eslint-disable-next-line import/no-extraneous-dependencies
const Electron = require('electron');
const nebulaEnv = require('./env');

const APP_NAME = 'Nebula Orion';
const HELP_URL = 'https://nebulabots.com';

nebulaEnv.setUpEnvironment();

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
    const templates = [MainMenu._menuEdit(), MainMenu._menuWindow(), MainMenu._menuHelp()];

    if (process.platform === 'darwin') {
      templates.unshift(MainMenu._menuApp(context));
    }

    if (nebulaEnv.isDevelopment()) {
      templates.push(MainMenu._menuView());
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
          click: async () => {
            await context.windowManager.createNewWindow('about');
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Services',
          role: 'services',
          submenu: [],
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
          click: () => {
            Electron.app.quit();
          },
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
    return {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.reload();
            }
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: (() => (process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I'))(),
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.toggleDevTools();
            }
          },
        },
      ],
    };
  }

  static _menuEdit() {
    return {
      label: 'Edit',
      submenu: [
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteandmatchstyle' },
        { role: 'selectall' },
      ],
    };
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
