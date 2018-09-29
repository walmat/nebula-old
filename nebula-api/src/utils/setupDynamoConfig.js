const dotenv = require('dotenv');
const nebulaenv = require('./env');
const baseConfig = require('../../dynamoConfig.json');

function getConfig() {
  dotenv.load();
  if (process.env.NODE_ENV === 'development') {
    nebulaenv.setUpDevEnvironment();
  }

  config = {
    ...baseConfig,
    endpoint: process.env.NEBULA_API_DYNAMODB_ENDPOINT,
    accessKeyId: process.env.NEBULA_API_DYNAMODB_SECRET_KEY || baseConfig.accessKeyId,
    secretAccessKey: process.env.NEBULA_API_DYNAMODB_ACCESS_KEY || baseConfig.secretAccessKey,
  };

  return config;
}
module.exports.getConfig = getConfig;