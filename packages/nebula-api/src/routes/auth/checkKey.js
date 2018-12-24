const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

const config = require('../../utils/setupDynamoConfig').getConfig();
const { storeUser } = require('../../../dynamoDBUser');
const { hash } = require('../../../hash');
const { salt, algo, output } = require('../../../hashConfig.json');

const SECRET_KEY = process.env.NEBULA_API_JWT_SECRET;

function checkValidKey(key) {
  AWS.config = new AWS.Config(config);
  const docClient = new AWS.DynamoDB.DocumentClient({
    endpoint: new AWS.Endpoint(config.endpoint),
  });
  const keyHash = hash(algo, key, salt, output);
  console.log('[DEBUG]: checking for hash: ', keyHash);
  const params = {
    TableName: 'Keys',
    Key: keyHash,
    KeyConditionExpression: '#licenseKey = :licenseKey',
    ExpressionAttributeNames: {
      '#licenseKey': 'licenseKey',
    },
    ExpressionAttributeValues: {
      ':licenseKey': keyHash,
    },
  };
  return docClient
    .query(params)
    .promise()
    .then(
      data => {
        console.log('[DEBUG]: CHECK KEY RESPONSE: ', data);
        if (data.Items.length && data.Items[0].licenseKey) {
          return data.Items[0].licenseKey;
        }
        return null;
      },
      err => {
        console.log('[ERROR]: CHECK KEY RESPONSE: ', err, err.stack);
        return null;
      },
    );
}
module.exports.checkValidKey = checkValidKey;

function checkIsInUse(key) {
  AWS.config = new AWS.Config(config);
  const docClient = new AWS.DynamoDB.DocumentClient({
    endpoint: new AWS.Endpoint(config.endpoint),
  });
  const keyHash = hash(algo, key, salt, output);
  const params = {
    TableName: 'Users',
    Key: keyHash,
    KeyConditionExpression: '#keyId = :keyId',
    ExpressionAttributeNames: {
      '#keyId': 'keyId',
    },
    ExpressionAttributeValues: {
      ':keyId': keyHash,
    },
  };
  return docClient
    .query(params)
    .promise()
    .then(
      data => {
        console.log('[DEBUG]: CHECK IN USE RESPONSE: ', data);
        return data.Items.length === 0;
      },
      err => {
        console.log('[ERROR]: CHECK IN USE RESPONSE: ', err, err.stack);
        return false;
      },
    );
}
module.exports.checkIsInUse = checkIsInUse;

async function verifyKey(key) {
  console.log(`[TRACE]: Starting Key Verification with key: ${key} ...`);
  const keyHash = await checkValidKey(key);
  if (!keyHash) {
    console.log('[TRACE]: KEY IS INVALID, returning error...');
    return {
      error: {
        name: 'InvalidKey',
        message: 'Invalid Key',
      },
    };
  }

  const notInUse = await checkIsInUse(keyHash);
  if (!notInUse) {
    console.log('[TRACE]: KEY IS IN USE, returning error...');
    return {
      error: {
        name: 'KeyInUse',
        message: 'Key In Use',
      },
    };
  }

  const refreshTokenPayload = await storeUser(keyHash);
  if (!refreshTokenPayload) {
    console.log('[TRACE]: UNABLE TO STORE USER, returning error...');
    return {
      error: {
        name: 'InternalError',
        message: 'Internal Error',
      },
    };
  }

  // Create Access Token
  const accessToken = jwt.sign(
    {
      key,
    },
    SECRET_KEY,
    {
      issuer: process.env.NEBULA_API_ID,
      subject: 'feauth',
      audience: 'fe',
      expiresIn: '2d',
    },
  );
  const { exp } = jwt.decode(accessToken);

  // Create refresh token
  const refreshToken = jwt.sign(
    {
      ref: refreshTokenPayload,
    },
    SECRET_KEY,
    {
      issuer: process.env.NEBULA_API_ID,
      subject: 'feref',
      audience: 'api',
      expiresIn: '90d',
    },
  );

  const response = {
    token_type: 'bearer',
    access_token: accessToken,
    expiry: exp,
    refresh_token: refreshToken,
  };
  console.log('[TRACE]: KEY VERIFIED: Returning Response: ', response);
  return response;
}
module.exports.verifyKey = verifyKey;
