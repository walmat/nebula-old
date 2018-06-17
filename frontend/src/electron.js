const fetch = require('node-fetch');
const windowManager = require('electron-window-manager');
var express = require('express');

/**
 * Get eletron dependencies:
 * app - module to control application life.
 * BrowserWindow - module to create native window browser
 * ipcMain - module to intercept renderer messages
 */
const electron = require('electron');
const {
  app,
  ipcMain,
  session,
  Menu
} = electron;
const path = require('path');
const url = require('url');
const moment = require('moment');
let captchas = []; //TODO - change this

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
// authWindow,
// captchaWindow;

function startMainWindow() {
  // Create a youtube window template
  windowManager.templates.set('youtube', {
    width: 700,
    height: 600,
    center: true,
    frame: true,
    fullscreenable: false,
    movable: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  windowManager.templates.set('captcha', {
    backgroundColor: '#f0f0f0',
    proxyRules: 'http://127.0.0.1:8080',
    center: true,
    fullscreen: false,
    height: 450,
    width: 450,
    maximizable: false,
    minimizable: false,
    resizable: false,
    skipTaskbar: true,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Set the default browser window settings
  windowManager.setDefaultSetup({
    width: 1000,
    height: 715,
    center: true,
    frame: false,
    fullscreenable: false,
    movable: true,
    resizable: false,
    icon: path.join(__dirname, '_assets/icons/png/64x64.png'),
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    onLoadFailure: (window) => {
      console.log('window load failure');
      console.log(window);
    },
  });

  // this will load localhost:3000 in developer environments,
  // otherwise it will load in production env
  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '/../build/index.html'),
    protocol: 'file:',
    slashes: true
  });

  // Use window manager to create main window
  mainWindow = windowManager.createNew('main', 'NEBULA', startUrl, null, null, true);

  // Make the window menu
  const menuTemplate = [{
      label: 'File',
      submenu: [
          {
              label: 'Quit',
              click() {
                  app.quit()
              },
              accelerator: 'CmdOrCtrl+Q',
          }]
      }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  mainWindow.open();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  startMainWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', app.quit);

app.on('before-quit', () => {
  windowManager.closeAll();
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    startMainWindow();
  }
});

ipcMain.on('harvest', function(event, token) {
    captchas.push({
        token: token,
        timestamp: moment(),
        host: 'http://checkout.shopify.com',
        sitekey: '6LfuO18UAAAAAClMxiQUvYyeGTn3xP5kZE0TFFHs'
    });

    console.log(captchas);
});

ipcMain.on('window-event', (event, arg) => {
  switch (arg) {
    case 'launchYoutube': {
        // open youtube url using youtube window template
        windowManager.open('youtube', 'YouTube', 'https://accounts.google.com/signin/v2/identifier?hl=en&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Ffeature%3Dsign_in_button%26hl%3Den%26app%3Ddesktop%26next%3D%252F%26action_handle_signin%3Dtrue&passive=true&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin', 'youtube', { parent: mainWindow }, false);
        break;
    }
    case 'launchHarvester': {
        // launch a harvester window

        //todo -- move this to the api
        /* to be done:
        *  1. send the event to the main process (a task that is needing a captcha)
        *  2. refresh the captcha page
        * */

        expressApp = express();
        expressApp.set('port', 6000);
        expressApp.use(express.json());
        expressApp.use(express.urlencoded({ extended: true }));

        expressApp.get('/', function(req, res) {
            res.sendFile('./captcha.html', {root: __dirname});
            session.defaultSession.setProxy({proxyRules:""}, function () {});
        });

        var server = expressApp.listen(expressApp.get('port'));

        session.defaultSession.setProxy({
            proxyRules: `http://127.0.0.1:6000`
        }, function (r) {
            windowManager.open('captcha', 'Harvester', 'http://checkout.shopify.com', 'captcha', {parent: mainWindow}, true);
        });
        // windowManager.open('captcha', 'Harvester', "http://checkout.shopify.com", 'captcha', { parent: mainWindow }, true);
        break;
    }
    case 'endSession': {
      // closes the YouTube window and signs the user out of that account
      windowManager.closeAllExcept('main');
      session.defaultSession.clearStorageData([], () => {
        // todo - error handle
      });
      session.defaultSession.clearCache(() => {
        // todo - error handle
      });
      break;
    }
    case 'quit': {
      app.quit();
      break;
    }
    default:
      break;
  }
});