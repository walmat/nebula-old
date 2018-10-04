var AWS = require("aws-sdk");
const crypto = require('crypto');
require('./src/utils/env').setUpEnvironment();
const config = require('./src/utils/setupDynamoConfig').getConfig();

const { hash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

async function storeUser(keyHash) {
  AWS.config = new AWS.Config(config);
  const dynamodb = new AWS.DynamoDB();
  const keyId = hash(algo, keyHash, salt, output);
  const refreshToken = await new Promise((resolve) => {
    crypto.randomBytes(48, (err, buffer) => {
      resolve(buffer.toString('hex'));
    });
  });
  const params = {
    Item: {
      "keyId": {
        S: keyId,
      },
      "refresh_token": {
        S: refreshToken,
      },
    }, 
    ReturnConsumedCapacity: "TOTAL", 
    TableName: "Users"
  };
  return await dynamodb.putItem(params).promise().then(
    (data) => {
      console.log('[SUCCESS]: Successfully added new user');
      return refreshToken;
    },
    (err) => {
      console.log('[ERROR]: ', err, err.stack);
      return null;
    }
  );
}

async function deleteUser(keyHash) {
  AWS.config = new AWS.Config(config);
  const dynamodb = new AWS.DynamoDB();
  const keyId = hash(algo, keyHash, salt, output);
  const params = {
    Key: {
      "keyId": {
        S: keyId,
      },
    },
    ReturnConsumedCapacity: "TOTAL", 
    TableName: "Users"
  };
  return await dynamodb.deleteItem(params).promise().then(
    (data) => {
      console.log('[SUCCESS]: Successfully deleted user');
      return true;
    },
    (err) => {
      console.log('[ERROR]: ', err, err.stack);
      return false;
    }
  );
}
module.exports = { storeUser, deleteUser };