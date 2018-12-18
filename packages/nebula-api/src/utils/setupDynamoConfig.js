const dotenv = require('dotenv');
const nebulaenv = require('./env');

function getConfig() {
  dotenv.load();
  nebulaenv.setUpEnvironment();

  const config = {
    region: process.env.NEBULA_API_DYNAMODB_REGION,
    endpoint: process.env.NEBULA_API_DYNAMODB_ENDPOINT,
    accessKeyId: process.env.NEBULA_API_DYNAMODB_ACCESS_KEY,
    secretAccessKey: process.env.NEBULA_API_DYNAMODB_SECRET_KEY,
  };

  return config;
}

module.exports.getConfig = getConfig;
