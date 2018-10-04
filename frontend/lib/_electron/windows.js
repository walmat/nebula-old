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
  winUrl: process.env.NEBULA_START_URL || `file:///${path.join(__dirname, '../../build/index.html')}`,
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
  winUrl: process.env.NEBULA_START_URL || `file:///${path.join(__dirname, '../../public/auth.html')}`,
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
  winUrl: 'https://accounts.google.com/signin/v2/identifier?hl=en&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Ffeature%3Dsign_in_button%26hl%3Den%26app%3Ddesktop%26next%3D%252F%26action_handle_signin%3Dtrue&passive=true&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin',
  tag: 'youtube',
});

const captchaWindow = () => ({
  win: new BrowserWindow({
    center: true,
    fullscreen: false,
    height: 415,
    width: 350,
    maximizable: false,
    minimizable: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: false,
      devTools: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
  }),
  winUrl: url.format({
    pathname: path.join(__dirname, '../../public/captcha.html'),
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
