const electron = require('electron');
const path = require('path');
const url = require('url');
const nebulaEnv = require('./env');

const { platform, env } = process;

// Set up nebula environment variables
if (env.NODE_ENV === 'development') {
  nebulaEnv.setUpDevEnvironment();
} else {
  nebulaEnv.setUpProdEnvironment();
}

/**
 * Get eletron dependencies:
 * app - module to control application life.
 * autoUpdate - module to push updates from the deployment url
 * BrowserWindow - module to create native window browser
 * ipcMain - module to intercept renderer messages
 */
const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  Menu,
  autoUpdater,
  dialog,
} = electron;

const { version } = app.getVersion();

let window;
let startUrl;

/**
 * CONSTANT PARAMETERS
 */
const AUTH_WIDTH = 300;
const AUTH_HEIGHT = 215;
const MAIN_WIDTH = 1000;
const MAIN_HEIGHT = 715;

// Install Dev tools extensions
const { default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = require('electron-devtools-installer');

const installExtensions = async () => {
  const devExts = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];

  await Promise.all(devExts.map(ext => installExtension(ext)
    .then(name => console.log(`Added Extension: ${name}`))
    .catch(err => console.error(`An Error Occurred: ${err}`))));
};

function getLicense() {
  if (env.NEBULA_ENV === 'development') {
    return true;
  }
  // TODO - setup api call of some sort to grab the license key data
  return false;
}

function checkForUpdates() {
  autoUpdater.setFeedURL(`https://nebula-deployment.herokuapp.com/dist/nebula/${version}`); // fix this??
  autoUpdater.on('error', err => window.webContents.send('error', err));
  autoUpdater.on('checking-for-update', () => window.webContents.send('log', 'checking-for-update', autoUpdater.getFeedURL()));
  autoUpdater.on('update-available', () => window.webContents.send('log', 'update-available', autoUpdater.getFeedURL()));
  autoUpdater.on('update-not-available', () => window.webContents.send('log', 'update-not-available', autoUpdater.getFeedURL()));
  autoUpdater.on('update-downloaded', (...args) => {
    window.webContents.send('log', 'update-downloaded', autoUpdater.getFeedURL(), args);
    const choice = dialog.showMessageBox(window, {
      message: 'An update has been downloaded. Do you want to restart now to finish installing it?',
      title: 'Update is ready',
      type: 'question',
      buttons: [
        'Yes',
        'No',
      ],
    });

    if (choice === 0) {
      autoUpdater.quitAndInstall();
    }
  });
  autoUpdater.checkForUpdates();
}

function setMenu() {
  const menu = [{
    label: 'File',
    submenu: [{
      label: 'Quit',
      click() {
        app.quit();
      },
      accelerator: 'CmdOrCtrl+Q',
    }],
  },
  {
    label: 'Edit',
    submenu: [{ role: 'copy' },
      { role: 'paste' },
      { role: 'selectall' }],
  }];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
}

function createWindow() {
  /**
   * -- auth check here -- something similar to: https://github.com/keygen-sh/example-electron-app/blob/master/main.js
   */

  if (env.NEBULA_ENV === 'development') {
    // load the main window in development always
    window = new BrowserWindow({
      width: MAIN_WIDTH,
      height: MAIN_HEIGHT,
      center: true,
      frame: false,
      fullscreenable: false,
      movable: true,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
      },
    });

    startUrl = env.NEBULA_START_URL || url.format({
      pathname: path.join(__dirname, '/../build/index.html'),
      protocol: 'file:',
      slashes: true,
    });
    window.webContents.openDevTools();
  } else {
    // otherwise, load the auth window by default...
    window = new BrowserWindow({
      width: AUTH_WIDTH,
      height: AUTH_HEIGHT,
      center: true,
      frame: false,
      fullscreenable: false,
      movable: true,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
      },
    });

    startUrl = url.format({
      // pathname: path.join(__dirname, '/../build/auth.html'),
      pathname: path.join(__dirname, '../../public/auth.html'),
      protocol: 'file:',
      slashes: true,
    });
  }

  // TEMPORARY
  window.webContents.openDevTools();

  window.loadURL(startUrl);
  setMenu();

  window.once('ready-to-show', () => {
    window.show();
  });

  // get authentication event from the main process
  ipcMain.on('unauthenticated', (event) => {
    window.hide();
    invalidate(); // invalidate the user's machine

    // show the auth window
    window = new BrowserWindow({
      width: AUTH_WIDTH,
      height: AUTH_HEIGHT,
      center: true,
      frame: false,
      fullscreenable: false,
      movable: true,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
      },
    });

    startUrl = url.format({
      pathname: path.join(__dirname, '../../public/auth.html'),
      protocol: 'file:',
      slashes: true,
    });
    window.loadURL(startUrl);
    window.once('ready-to-show', () => {
      window.show();
    });
  });

  // load the application when the user validates
  ipcMain.on('authenticate', async (event) => {
    // change window stuff
    window = new BrowserWindow({
      width: MAIN_WIDTH,
      height: MAIN_HEIGHT,
      center: true,
      frame: false,
      fullscreenable: false,
      movable: true,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
      },
    });
    startUrl = env.NEBULA_START_URL || url.format({
      pathname: path.join(__dirname, '/../build/index.html'),
      protocol: 'file:',
      slashes: true,
    });

    if (env.NEBULA_ENV === 'development') {
      window.webContents.openDevTools();
      return; // don't update dev environment
    }
    const { license } = await getLicense(); // API call here
    if (!license) {
      window.close();
      // invalidate();
      return;
    }
    window.loadURL(startUrl);
    window.once('ready-to-show', () => {
      window.show();
    });
    checkForUpdates();
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  await installExtensions();
  createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', app.quit);

app.on('before-quit', () => {
  // TODO close all windows!
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (window === null) {
    createWindow();
  }
});

ipcMain.on('window-event', (event, arg) => {
  switch (arg) {
    case 'launchYoutube': {
      // open youtube url using youtube window template
      // if (ytWin === null) {
      //   youtubeWindow.loadURL('https://accounts.google.com/signin/v2/identifier?hl=en&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Ffeature%3Dsign_in_button%26hl%3Den%26app%3Ddesktop%26next%3D%252F%26action_handle_signin%3Dtrue&passive=true&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin')
      // }
      break;
    }
    case 'launchHarvester': {
      /*
      *  1. send the event to the main process (a task that is needing a captcha)
      *  2. refresh the captcha page
      * */
      break;
    }
    case 'endSession': {
      // close all the windows and signs the user out of that google account
      // TODO - close wnidows
      session.defaultSession.clearStorageData([], () => {
        // todo - error handle
      });
      session.defaultSession.clearCache(() => {
        // todo - error handle
      });
      break;
    }
    case 'quit': {
      // TODO - deauth user and close application
      app.quit();
      break;
    }

    case 'close': {
      // TODO - just close application
      app.quit();
      break;
    }
    default:
      console.log(event, arg);
      break;
  }
});
