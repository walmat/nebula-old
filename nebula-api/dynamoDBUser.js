var AWS = require("aws-sdk");
const crypto = require('crypto');
// FOR USE IN DEV MODE ONLY!
process.env.NODE_ENV = 'development'
const config = require('./src/utils/setupDynamoConfig').getConfig();

const { makeHash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

async function storeUser(keyHash) {
  AWS.config.update(config);
  const dynamodb = new AWS.DynamoDB();
  const keyId = crypto.createHash(algo)
        .update(keyHash)
        .update(makeHash(salt))
        .digest(output);
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
      console.log('success');
      return refreshToken;
    },
    (err) => {
      console.log('[ERROR]: ', err, err.stack);
      return null;
    }
  );
}

async function removeUser(keyHash) {
  AWS.config.update(config);
  const dynamodb = new AWS.DynamoDB();
  const keyId = crypto.createHash(algo)
        .update(keyHash)
        .update(makeHash(salt))
        .digest(output);
  const params = {
    Item: {
      "keyId": {
        S: keyId
      }
    }, 
    ReturnConsumedCapacity: "TOTAL", 
    TableName: "Users"
  };
  return await dynamodb.deleteItem(params).promise().then(
    (data) => {
      console.log('success');
      return true;
    },
    (err) => {
      console.log('[ERROR]: ', err, err.stack);
      return false;
    }
  );
}
module.exports = { storeUser, removeUser };