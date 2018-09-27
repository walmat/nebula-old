const electron = require('electron');
const path = require('path');
const url = require('url');
const fetch = require('node-fetch');
const nebulaEnv = require('./env');
const nebulaAuth = require('./auth');

const { platform, env } = process;

const isDevelopment = env.NODE_ENV === 'development';

const { mainWindow, authWindow, captchaWindow, youtubeWindow } = require('./windows');
const { menu } = require('./menu');

// Set up nebula environment variables
if (isDevelopment) {
  nebulaEnv.setUpDevEnvironment();
} else {
  nebulaEnv.setUpProdEnvironment();
}

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
  autoUpdater,
  dialog,
  ipcMain,
  Menu,
} = electron;

const { version } = app.getVersion();

let window;
let startUrl;

// Install Dev tools extensions
const { default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = require('electron-devtools-installer');

const installExtensions = async () => {
  const devExts = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];

  await Promise.all(devExts.map(ext => installExtension(ext)
    .then(name => console.log(`Added Extension: ${name}`))
    .catch(err => console.error(`An Error Occurred: ${err}`))));
};

async function validate(key) {
  // if (isDevelopment) {
  //   return true;
  // }
  if (key === null) {
    return false;
  }
  const res = await fetch('http://localhost:8080/auth', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key }),
  });
  if (res.status === 200) {
    return true;
  }
  return false;
}

async function invalidate(key) {
  if (key === null) {
    return false;
  }
  const res = await fetch('http://localhost:8080/auth', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key }),
  });
  if (res.status === 200) {
    return true;
  }
  // change some flag here in the db or something..?
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
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu()));
}

async function createWindow() {
  /**
   * -- auth check here -- something similar to: https://github.com/keygen-sh/example-electron-app/blob/master/main.js
   */
  let session = nebulaAuth.getSession();
  if (!session) {
    // session doesn't exist, attempt to get new session using previous auth
    const prevLicense = nebulaAuth.getPreviousLicense();
    if (prevLicense) {
      session = await nebulaAuth.createSession(prevLicense.key);
    }

    if (!session) {
      // Previous License was not found, nor could it be used to create a new session
      window = authWindow();
      startUrl = url.format({
        pathname: path.join(__dirname, '../../public/auth.html'),
        protocol: 'file:',
        slashes: true,
      });
    } else {
      // new session created, display main window
      window = mainWindow();
      startUrl = env.NEBULA_START_URL || url.format({
        pathname: path.join(__dirname, '/../build/index.html'),
        protocol: 'file:',
        slashes: true,
      });
      // if (isDevelopment) {
        window.webContents.openDevTools();
      // }
    }
  } else {
    // session is there, display main window
    window = mainWindow();
    startUrl = env.NEBULA_START_URL || url.format({
      pathname: path.join(__dirname, '/../build/index.html'),
      protocol: 'file:',
      slashes: true,
    });
    // if (isDevelopment) {
      window.webContents.openDevTools();
    // }
  }
  // FOR TESTING PURPOSES, UNCOMMENT
  window.webContents.openDevTools();

  window.loadURL(startUrl);
  setMenu();

  window.once('ready-to-show', () => {
    window.show();
  });
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
  if (window === null) {
    createWindow();
  }
});

ipcMain.on('window-event', async (event, arg) => {
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
      // session.defaultSession.clearStorageData([], () => {
      // todo - error handle
      // });
      // session.defaultSession.clearCache(() => {
      // todo - error handle
      // });
      break;
    }
    case 'quit': {
      // TODO - deauth user and close application
      app.quit();
      break;
    }

    case 'close': {
      // TODO - just close application
      console.log('here');
      await nebulaAuth.clearSession(); // temporary
      app.quit();
      break;
    }
    default:
      console.log(event, arg);
      break;
  }
});

// get authentication event from the main process
ipcMain.on('unauthenticated', async (event) => {
  window.close();
  window = null;
  const invalidated = await invalidate(); // invalidate the user's machine
  if (!invalidated) {
    ipcMain.send('error', 'Unable to invalidate');
    return;
  }
  // show the auth window
  window = authWindow();
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
ipcMain.on('authenticate', async (event, key) => {
  let session = nebulaAuth.getSession();
  if (!session) {
    // Use key to create session
    session = await nebulaAuth.createSession(key);
  }

  window.hide();
  window = null;

  if (session) {
    // session is there, display main window
    window = mainWindow();
    startUrl = env.NEBULA_START_URL || url.format({
      pathname: path.join(__dirname, '/../build/index.html'),
      protocol: 'file:',
      slashes: true,
    });
    // if (isDevelopment) {
      window.webContents.openDevTools();
    // }
  } else {
    window = authWindow();
    startUrl = url.format({
      pathname: path.join(__dirname, '../../public/auth.html'),
      protocol: 'file:',
      slashes: true,
    });
  }

  window.loadURL(startUrl);
  window.once('ready-to-show', () => {
    window.show();
  });
  checkForUpdates();
  return true;

  // /**
  //  * TODO – handle authentication here..
  //  */
  // const license = await checkLicense(key); // API call here
  // if (!license) {
  //   return new Error('Invalid Key');
  // }

  // window.hide();
  // window = null;
  // // else if valid, do this stuff..
  // // change window stuff
  // window = mainWindow();
  // startUrl = env.NEBULA_START_URL || url.format({
  //   pathname: path.join(__dirname, '../../build/index.html'),
  //   protocol: 'file:',
  //   slashes: true,
  // });

  // if (isDevelopment) {
  //   window.webContents.openDevTools();
  // }
  // window.loadURL(startUrl);
  // window.once('ready-to-show', () => {
  //   window.show();
  // });
  // checkForUpdates();
  // return true;
});
