const electron = require('electron');
const dynamodb = require('../../backend/db.config');
const docClient = dynamodb.DocumentClient;

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

let auth = false; //todo change later

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let authWindow;

function startMainWindow() {

    // Create the browser window.
    mainWindow = new BrowserWindow({
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
            preload: 'preload.js'
        }
    });

    //this will load localhost:3000 in developer enviroments, otherwise it will load in production env
    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '/../build/index.html'),
        protocol: 'file:',
        slashes: true
    });
    mainWindow.loadURL(startUrl);

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

function startAuthWindow() {

    // Create the browser window.
    authWindow = new BrowserWindow({
        width: 350,
        height: 200,
        center: true,
        frame: false,
        fullscreenable: false,
        movable: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            preload: 'preload.js'
        }
    });

    //this will load localhost:3000 in developer enviroments, otherwise it will load in production env
    const startUrl = url.format({
        pathname: path.join(__dirname, '/../build/auth.html'),
        protocol: 'file:',
        slashes: true
    });
    authWindow.loadURL(startUrl);

    // Open the DevTools.
    authWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    authWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        authWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  if (auth) {
      startMainWindow();
  }  else {
      startAuthWindow();
  }
});

// Quit when all windows are closed.
app.on('window-all-closed', app.quit);

app.on('before-quit', () => {
    mainWindow.removeAllListeners('close');
    mainWindow.close();
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null && auth) {
        startMainWindow();
    } else {
        startAuthWindow();
    }
});

//From here, React should handle what the Electron app does
