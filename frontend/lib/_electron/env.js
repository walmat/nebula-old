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
  }
}

function setUpDevEnvironment() {
  _setUpEnvironment('.env.dev');
}

function setUpProdEnvironment() {
  _setUpEnvironment('.env.prod');
}

module.exports = { setUpDevEnvironment, setUpProdEnvironment };

