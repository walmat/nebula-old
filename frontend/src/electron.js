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

    // // Create the browser window.
    // mainWindow = new BrowserWindow({
    //     width: 1000,
    //     height: 715,
    //     center: true,
    //     frame: false,
    //     fullscreenable: false,
    //     movable: true,
    //     resizable: false,
    //     icon: path.join(__dirname, '_assets/icons/png/64x64.png'),
    //     webPreferences: {
    //         nodeIntegration: true,
    //         preload: 'preload.js'
    //     }
    // });

    // //this will load localhost:3000 in developer enviroments, otherwise it will load in production env
    // const startUrl = process.env.ELECTRON_START_URL || url.format({
    //     pathname: path.join(__dirname, '/../build/index.html'),
    //     protocol: 'file:',
    //     slashes: true
    // });
    // mainWindow.loadURL(startUrl);

    // // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    // // Emitted when the window is closed.
    // mainWindow.on('closed', function () {
    //     // Dereference the window object, usually you would store windows
    //     // in an array if your app supports multi windows, this is the time
    //     // when you should delete the corresponding element.
    //     mainWindow = null
    // })
    // Set the default window setup

    // let youtube = new BrowserWindow({
    //     width: 400,
    //     height: 600,
    //     center: true,
    //     frame: true,
    //     fullscreenable: false,
    //     movable: true,
    //     resizable: false,
    //     webPreferences: {
    //         nodeIntegration: false,
    //         preload: 'preload.js'
    //     }
    // });
    // youtube.loadURL('http://youtube.com');
    // 
    // // Emitted when the window is closed.
    // youtube.on('closed', function () {
    //     // Dereference the window object, usually you would store windows
    //     // in an array if your app supports multi windows, this is the time
    //     // when you should delete the corresponding element.
    //     youtube = null
    // })

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
    if (arg === 'launchYoutube') {
       windowManager.open('youtube', 'YOUTUBE', 'https://www.youtube.com', 'youtube', {parent: mainWindow}, true);
    } else if (arg === 'quit') {
        app.quit();
    }
});
