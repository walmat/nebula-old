const electron = require('electron');
const path = require('path');

const { BrowserWindow } = electron;

const mainWindow = () => new BrowserWindow({
  width: 1000,
  height: 715,
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

const authWindow = () => new BrowserWindow({
  width: 300,
  height: 215,
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

const youtubeWindow = () => new BrowserWindow({
  width: 450,
  height: 475,
  center: true,
  frame: true,
  fullscreenable: false,
  movable: true,
  resizable: true,
  webPreferences: {
    nodeIntegration: false,
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: true,
  },
});

const captchaWindow = () => new BrowserWindow({
  proxyRules: 'http://127.0.0.1:8080',
  center: true,
  fullscreen: false,
  height: 475,
  width: 450,
  maximizable: false,
  minimizable: false,
  frame: false,
  resizable: false,
  skipTaskbar: true,
  useContentSize: true,
  webPreferences: {
    nodeIntegration: false,
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: true,
  },
});

module.exports = {
  captchaWindow,
  mainWindow,
  youtubeWindow,
  authWindow,
};
