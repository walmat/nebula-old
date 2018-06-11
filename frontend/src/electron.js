const electron = require('electron');
const windowManager = require('electron-window-manager');

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// IPC Main to intercept requires from the renderer
const ipcMain = electron.ipcMain;

const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow, authWindow, captchaWindow;

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
            nodeIntegration: true,
            preload: 'preload.js'
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
            nodeIntegration: true,
            preload: 'preload.js'
        },
        'onLoadFailure': function(window) {
            console.log('window load failure');
            console.log(window);
        }
    });

    //this will load localhost:3000 in developer enviroments, otherwise it will load in production env
    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '/../build/index.html'),
        protocol: 'file:',
        slashes: true
    });

    // Use window manager to create main window
    mainWindow = windowManager.createNew('main', 'NEBULA', startUrl, null, null, true);

    mainWindow.open();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
    startMainWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', app.quit);

app.on('before-quit', () => {
    windowManager.closeAll();
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        startMainWindow();
    }
});

//From here, React should handle what the Electron app does
ipcMain.on('window-event', (event, arg) => {
    switch (arg) {
        case 'launchYoutube': {
            // open youtube url using youtube window template
            windowManager.open('youtube', 'YouTube', 'https://accounts.google.com/signin/v2/identifier?hl=en&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Ffeature%3Dsign_in_button%26hl%3Den%26app%3Ddesktop%26next%3D%252F%26action_handle_signin%3Dtrue&passive=true&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin', 'youtube', {parent: mainWindow}, true);
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
