const Electron = require('electron');
const Path = require('path');

/**
 * Creates an Auth Window
 *
 * @return {BrowserWindow} Auth Window
 */
const createAuthWindow = () => new Electron.BrowserWindow({
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
    preload: Path.join(__dirname, '../_electron/preload.js'),
    webSecurity: true,
  },
});

/**
 * Creates an About Window
 *
 * @return {BrowserWindow} About Window
 */
const createAboutWindow = () => new Electron.BrowserWindow({
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
    webSecurity: true,
  },
});

/**
 * Creates an Captcha Window
 *
 * @return {BrowserWindow} Captcha Window
 */
const createCaptchaWindow = () => new Electron.BrowserWindow({
  width: 415,
  height: 350,
  center: true,
  frame: false,
  fullscreenable: false,
  movable: true,
  resizable: false,
  show: false,
  webPreferences: {
    nodeIntegration: false,
    preload: Path.join(__dirname, '../_electron/preload.js'),
    webSecurity: true,
  },
});

/**
 * Creates an YouTube Window
 *
 * @return {BrowserWindow} YouTube Window
 */
const createYouTubeWindow = () => new Electron.BrowserWindow({
  width: 450,
  height: 475,
  center: true,
  frame: false,
  fullscreenable: false,
  movable: true,
  resizable: false,
  show: false,
  webPreferences: {
    nodeIntegration: false,
    preload: Path.join(__dirname, '../_electron/preload.js'),
    webSecurity: true,
  },
});

/**
 * Creates an Main Window
 *
 * @return {BrowserWindow} Main Window
 */
const createMainWindow = () => new Electron.BrowserWindow({
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
    preload: Path.join(__dirname, '../_electron/preload.js'),
    webSecurity: true,
  },
});

module.exports = {
  createAboutWindow,
  createAuthWindow,
  createCaptchaWindow,
  createMainWindow,
  createYouTubeWindow,
};
