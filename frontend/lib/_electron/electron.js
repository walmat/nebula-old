const electron = require('electron');
const nebulaEnv = require('./env');
const nebulaAuth = require('./AuthManager');
const nebulaDebug = require('./debug');
const nebulaCheckUpdates = require('./checkUpdates');
const {
  mainWindow, authWindow, captchaWindow, youtubeWindow,
} = require('../common/windows');
const { menu } = require('./menu');

// Set up nebula environment variables
nebulaEnv.setUpEnvironment();
const isDevelopment = process.env.NEBULA_ENV === 'development';

/**
 * Get eletron dependencies:
 * app - module to control application life.
 * autoUpdater - module to push updates from the deployment url
 * dialog - module to display a dialog from the main process (used with autoUpdater)
 * ipcMain - module to intercept renderer messages
 * Menu - module to define and control the structure of the native application menu
 * session - controls the session for the life of an electron window
 */
const {
  app,
  ipcMain,
  Menu,
} = electron;

const current = {};
const prev = {};

function setMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu()));
}

const _hideCurrentWindow = () => {
  if (current && current.window) {
    current.window.webContents.closeDevTools();
    current.window.hide();
    prev.window = current.window;
    prev.url = current.url;
    prev.tag = current.tag;
  }
};

const _showNewWindow = ({ win, winUrl, tag }) => {
  if (tag === 'main' || tag === 'auth') {
    _hideCurrentWindow();
  }
  current.window = win;
  current.url = winUrl;
  current.tag = tag;

  current.window.loadURL(current.url);
  current.window.on('ready-to-show', () => {
    prev.window = null;
    prev.url = null;
    prev.tag = null;
    current.window.show();
    setMenu();
    if (isDevelopment || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
      current.window.webContents.openDevTools();
    }
  });
};

// Install Dev tools extensions
const { default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = require('electron-devtools-installer');

const installExtensions = async () => {
  const devExts = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];

  await Promise.all(devExts.map(ext => installExtension(ext)
    .then(name => console.log(`Added Extension: ${name}`))
    .catch(err => console.error(`An Error Occurred: ${err}`))));
};

async function createWindow() {
  /**
   * -- auth check here -- something similar to: https://github.com/keygen-sh/example-electron-app/blob/master/main.js
   */
  const session = await nebulaAuth.getSession();

  if (!session || (session && session.errors)) {
    // Previous License was not found, nor could it be used to create a new session
    _showNewWindow(authWindow());
  } else {
    // session is there, display main window
    _showNewWindow(mainWindow());
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment) {
    await installExtensions();
  }
  createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', app.quit);

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (current.window === null) {
    createWindow();
  }
});

ipcMain.on('window-event', async (event, arg) => {
  switch (arg) {
    case 'launchYoutube': {
      _showNewWindow(youtubeWindow());
      break;
    }
    case 'launchHarvester': {
      /*
      *  1. send the event to the main process (a task that is needing a captcha)
      *  2. refresh the captcha page
      * */
      _showNewWindow(captchaWindow());
      break;
    }
    case 'endSession': {
      // close all the windows and signs the user out of that google account
      // TODO - close wnidows
      // session.defaultSession.clearStorageData([], () => {
      // todo - error handle
      // });
      // session.defaultSession.clearCache(() => {
      // todo - error handle
      // });
      break;
    }
    case 'quit': {
      await nebulaAuth.clearSession();
      app.quit();
      break;
    }

    case 'close': {
      app.quit();
      break;
    }
    default:
      console.log(event, arg);
      break;
  }
});

ipcMain.on('auth', async (event, { arg, key }) => {
  switch (arg) {
    case 'activate': {
      let session = await nebulaAuth.getSession();
      if (!session) {
        session = await nebulaAuth.createSession(key);
      }

      if (!session || (session && session.errors)) {
        // no session or session has errors, display auth
        _showNewWindow(authWindow());
      } else {
        _showNewWindow(mainWindow());
        nebulaCheckUpdates.checkForUpdates(current.window);
      }
      break;
    }
    case 'deactivate': {
      const clearSession = await nebulaAuth.clearSession();
      if (!clearSession) {
        event.sender.send('error', 'Unable to deactivate');
        return;
      }
      _showNewWindow(authWindow());
      break;
    }
    default: {
      break;
    }
  }
});

nebulaDebug.bindDebugEvents();
