const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let _isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Sets up our environment variables based on `prod` || `dev` environment
 * @param {String} envFname name of environment file to open
 */
function _setUpEnvironment(envFname) {
  const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, `../../${envFname}`)));
  if (envConfig) {
    Object.keys(envConfig).forEach(k => {
      if (k.startsWith('NEBULA_')) {
        process.env[k] = envConfig[k];
      }
    });
    _isDevelopment = process.env.NEBULA_ENV === 'development';
    // TEMPORARY PATCH TO CHANGE THREADPOOL SIZE
    process.env.UV_THREADPOOL_SIZE = 128;
    process.env.NEBULA_ENV_LOADED = true;
  }
}

/**
 * Sets up development environment variables
 */
function setUpDevEnvironment() {
  if (!process.env.NEBULA_ENV_LOADED) {
    _setUpEnvironment('.env.dev');
  }
}

/**
 * Sets up production environment variables
 */
function setUpProdEnvironment() {
  if (!process.env.NEBULA_ENV_LOADED) {
    _setUpEnvironment('.env.prod');
  }
}

/**
 * Used to tell whether or not we're in development
 * @return {Boolean} in development or not
 */
function isDevelopment() {
  return _isDevelopment;
}

/**
 * Function to call the proper respective function
 * based on whether or not we're in development
 */
function setUpEnvironment() {
  if (isDevelopment()) {
    setUpDevEnvironment();
  } else {
    setUpProdEnvironment();
  }
}

module.exports = {
  setUpDevEnvironment,
  setUpProdEnvironment,
  setUpEnvironment,
  isDevelopment,
};
