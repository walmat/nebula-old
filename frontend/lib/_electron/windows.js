const path = require('path');
const url = require('url');
const { BrowserWindow } = require('electron');

const mainWindow = () => ({
  win: new BrowserWindow({
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
  }),
  winUrl: process.env.NEBULA_START_URL || url.format({
    pathname: path.join(__dirname, '../../build/index.html'),
    protocol: 'file:',
    slashes: true,
  }),
  tag: 'main',
});

const authWindow = () => ({
  win: new BrowserWindow({
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
  }),
  winUrl: url.format({
    pathname: path.join(__dirname, '../../public/auth.html'),
    protocol: 'file:',
    slashes: true,
  }),
  tag: 'auth',
});

const youtubeWindow = () => ({
  win: new BrowserWindow({
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
  }),
  // TODO: CHANGE THIS
  winUrl: process.env.NEBULA_START_URL || url.format({
    pathname: path.join(__dirname, '../../build/index.html'),
    protocol: 'file:',
    slashes: true,
  }),
  tag: 'youtube',
});

const captchaWindow = () => ({
  win: new BrowserWindow({
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
  }),
  // TODO: CHANGE THIS
  winUrl: process.env.NEBULA_START_URL || url.format({
    pathname: path.join(__dirname, '../../build/index.html'),
    protocol: 'file:',
    slashes: true,
  }),
  tag: 'captcha',
});

module.exports = {
  captchaWindow,
  mainWindow,
  youtubeWindow,
  authWindow,
};
