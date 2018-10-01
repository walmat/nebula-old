const fs = require('fs');
const dotenv = require('dotenv');

function _setUpEnvironment(envFname) {
  const envConfig = dotenv.parse(fs.readFileSync(envFname));
  if (envConfig) {
    Object.keys(envConfig).forEach((k) => {
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

function setUpEnvironment() {
  if (process.env.NODE_ENV === 'development') {
    setUpDevEnvironment();
  } else {
    setUpProdEnvironment();
  }
}

module.exports = { setUpDevEnvironment, setUpProdEnvironment, setUpEnvironment };
