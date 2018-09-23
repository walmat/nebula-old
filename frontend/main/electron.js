const express = require('express');
const electron = require('electron');
const moment = require('moment');
const {
  mainWindow,
  authWindow,
  captchaWindow,
  youtubeWindow,
} = require('./windows.js');
const { menu } = require('./menu.js');
const { checkForUpdates } = require('./checkUpdates');

const { platform, env } = process;

/**
 * Get eletron dependencies:
 * app - module to control application life.
 * autoUpdate - module to push updates from the deployment url
 * BrowserWindow - module to create native window browser
 * ipcMain - module to intercept renderer messages
 */

const {
  app,
  ipcMain,
  session,
  Menu,
} = electron;

const { version } = app.getVersion();


// Install Dev tools extensions
const { default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = require('electron-devtools-installer');

const installExtensions = async () => {
  const devExts = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];

  await Promise.all(devExts.map(ext => installExtension(ext)
    .then(name => console.log(`Added Extension: ${name}`))
    .catch(err => console.error(`An Error Occurred: ${err}`))));
};

function getLicense() {
  if (env.NODE_NV === 'development') {
    return true;
  }
  // TODO - setup api call of some sort to grab the license key data
  return false;
}


function createWindow() {
  /**
   * -- auth check here -- something similar to: https://github.com/keygen-sh/example-electron-app/blob/master/main.js
   */

  // load the auth window by default...
  authWindow.loadURL(`file://${__dirname}/auth.html`);
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));

  // get authentication event from the main process
  ipcMain.on('unauthenticated', (event) => {
    unvalidate(); // invalidate the user's machine
    authWindow.loadURL(`file://${__dirname}/auth.html`);
  });

  // load the application when the user validates
  ipcMain.on('authenticated', async (event) => {
    mainWindow.loadURL(`file://${__dirname}/index.html`);

    if (env.NODE_ENV === 'development') {
      return; // don't update dev environment
    }
    const { license } = await getLicense(); // API call here
    if (!license) {
      return; // some how this is happening?
    }
    checkForUpdates(mainWindow);
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
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('window-event', (event, arg) => {
  switch (arg) {
    case 'launchYoutube': {
      // open youtube url using youtube window template
      if (youtubeWindow === null) {
        youtubeWindow.loadURL('https://accounts.google.com/signin/v2/identifier?hl=en&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Ffeature%3Dsign_in_button%26hl%3Den%26app%3Ddesktop%26next%3D%252F%26action_handle_signin%3Dtrue&passive=true&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin')
      }
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
