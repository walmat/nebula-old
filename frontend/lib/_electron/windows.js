const Electron = require('electron');
const Path = require('path');
const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

/**
 * Map of our respective urls
 * :: (name, ref)
 */
const urls = new Map();

/**
 * Creates an Auth Window
 *
 * @return {BrowserWindow} Auth Window
 */
const createAuthWindow = async () => new Electron.BrowserWindow({
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

const authUrl = `file:///${Path.join(__dirname, '../../build/auth.html')}`;
urls.set('auth', authUrl);

/**
 * Creates an About Window
 *
 * @return {BrowserWindow} About Window
 */
const createAboutWindow = async () => new Electron.BrowserWindow({
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

const aboutUrl = `file:///${Path.join(__dirname, '../../build/about.html')}`;
urls.set('about', aboutUrl);

/**
 * Creates an Captcha Window
 *
 * @return {BrowserWindow} Captcha Window
 */
const createCaptchaWindow = async () => new Electron.BrowserWindow({
  width: 400,
  height: 650,
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

const captchaUrl = `file:///${Path.join(__dirname, '../../build/captcha.html')}`;
urls.set('captcha', captchaUrl);

/**
 * Creates an YouTube Window
 *
 * @return {BrowserWindow} YouTube Window
 */
const createYouTubeWindow = async () => new Electron.BrowserWindow({
  width: 450,
  height: 475,
  center: true,
  frame: true,
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

const youtubeUrl = 'https://accounts.google.com/signin/v2/identifier?hl=en&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Ffeature%3Dsign_in_button%26hl%3Den%26app%3Ddesktop%26next%3D%252F%26action_handle_signin%3Dtrue&passive=true&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin';
urls.set('youtube', youtubeUrl);

/**
 * Creates an Main Window
 *
 * @return {BrowserWindow} Main Window
 */
const createMainWindow = async () => new Electron.BrowserWindow({
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

const mainUrl = process.env.NEBULA_START_URL || `file:///${Path.join(__dirname, '../../build/index.html')}`;
urls.set('main', mainUrl);

module.exports = {
  createAboutWindow,
  createAuthWindow,
  createCaptchaWindow,
  createMainWindow,
  createYouTubeWindow,
  urls,
};
