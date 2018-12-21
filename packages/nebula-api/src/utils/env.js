const fs = require('fs');
const dotenv = require('dotenv');

const _isDevelopment = process.env.NEBULA_API_ENV === 'development';

function _setUpEnvironment(envFname) {
  const envConfig = dotenv.parse(fs.readFileSync(envFname));
  if (envConfig) {
    Object.keys(envConfig).forEach(k => {
      if (k.startsWith('NEBULA_')) {
        process.env[k] = envConfig[k];
      }
    });
    process.env.NEBULA_ENV_LOADED = true;
  }
}

function setUpDevEnvironment() {
  if (!process.env.NEBULA_ENV_LOADED) {
    _setUpEnvironment('.env.dev');
  }
}

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
