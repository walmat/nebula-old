const dotenv = require('dotenv');
const nebulaenv = require('./env');
// eslint-disable-next-line import/no-unresolved
const baseConfig = require('../../dynamoConfig.json');

function getConfig() {
  dotenv.config();
  nebulaenv.setUpEnvironment();

  const config = {
    ...baseConfig,
    endpoint: process.env.NEBULA_API_DYNAMODB_ENDPOINT,
    accessKeyId: process.env.NEBULA_API_DYNAMODB_ACCESS_KEY || baseConfig.accessKeyId,
    secretAccessKey: process.env.NEBULA_API_DYNAMODB_SECRET_KEY || baseConfig.secretAccessKey,
  };

  return config;
}
module.exports.getConfig = getConfig;
