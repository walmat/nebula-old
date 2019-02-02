const AWS = require('aws-sdk');
require('./src/utils/env').setUpEnvironment();
const config = require('./src/utils/setupDynamoConfig').getConfig();

const { hash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

async function storeUser(keyHash, refreshToken, expiry) {
  AWS.config = new AWS.Config(config);
  const dynamodb = new AWS.DynamoDB();
  const keyId = hash(algo, keyHash, salt, output);
  const params = {
    Item: {
      keyId: {
        S: keyId,
      },
      refresh_token: {
        S: refreshToken,
      },
      expiry: {
        N: `${expiry}`,
      },
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: 'Users',
  };
  return dynamodb
    .putItem(params)
    .promise()
    .then(
      () => {
        console.log('[SUCCESS]: Successfully added new user');
        return refreshToken;
      },
      err => {
        console.log('[ERROR]: ', err, err.stack);
        throw new Error(err.message);
      },
    );
}

async function deleteUser(keyHash) {
  AWS.config = new AWS.Config(config);
  const dynamodb = new AWS.DynamoDB();
  const keyId = hash(algo, keyHash, salt, output);
  const params = {
    Key: {
      keyId: {
        S: keyId,
      },
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: 'Users',
  };
  return dynamodb
    .deleteItem(params)
    .promise()
    .then(
      () => {
        console.log('[SUCCESS]: Successfully deleted user');
        return true;
      },
      err => {
        console.log('[ERROR]: ', err, err.stack);
        return false;
      },
    );
}
module.exports = { storeUser, deleteUser };
