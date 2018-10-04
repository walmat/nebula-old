const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

const config = require('../../utils/setupDynamoConfig').getConfig();
const { storeUser, deleteUser } = require('../../../dynamoDBUser');
const { hash } = require('../../../hash');
const { salt, algo, output } = require('../../../hashConfig.json');

const SECRET_KEY = process.env.NEBULA_API_JWT_SECRET;

function generateTokens(key, refreshPayload) {
  // Generate Access Token
  const accessToken = jwt.sign({
    key,
  },
  SECRET_KEY,
  {
    issuer: process.env.NEBULA_API_ID,
    subject: 'feauth',
    audience: 'fe',
    expiresIn: '2d',
  });
  const { exp } = jwt.decode(accessToken);

  // Generate Refresh token
  const refreshToken = jwt.sign({
    ref: refreshPayload,
    key,
  },
  SECRET_KEY,
  {
    issuer: process.env.NEBULA_API_ID,
    subject: 'feref',
    audience: 'api',
    expiresIn: '90d',
  });

  // Craft response
  const response = {
    tokenType: 'bearer',
    accessToken: accessToken,
    expiry: exp,
    refreshToken: refreshToken,
  };
  return response;
}
module.exports.generateTokens = generateTokens;

function checkValidKey(key) {
  AWS.config = new AWS.Config(config);
  const docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });
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
  return docClient.query(params).promise().then(
    (data) => {
      console.log('[DEBUG]: CHECK KEY RESPONSE: ', data);
      if (data.Items.length && data.Items[0].licenseKey) {
        return data.Items[0].licenseKey;
      }
      return null;
    },
    (err) => {
      console.log('[ERROR]: CHECK KEY RESPONSE: ', err, err.stack);
      return null;
    }
  );
}
module.exports.checkValidKey = checkValidKey;

/**
 * Returns the discord user tied to a given key
 * @param {*} key – unmalformed license key data
 */
async function getDiscordUser(keyHash) {
  AWS.config = new AWS.Config(config);
  let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });
  let params = {
    TableName: 'Discord',
    Key: keyHash,
    KeyConditionExpression: '#licenseKey = :licenseKey',
    ExpressionAttributeNames: {
      '#licenseKey': 'licenseKey',
    },
    ExpressionAttributeValues: {
      ':licenseKey': keyHash,
    },
  };
  return docClient.query(params).promise().then(
    (data) => {
      console.log('[DEBUG]: CHECK DISCORD USER RESPONSE: ', data);
      if(data.Items.length) {
        if (data.Items.length > 1) {
          console.log('[WARN]: Data Items is longer than one! Using first response');
        }
        return data.Items[0];
      }
      return null;
    },
    (err) => {
      console.log('[ERROR]: CHECK DISCORD USER RESPONSE: ', err, err.stack);
      return null;
    }
  );
}
module.exports.getDiscordUser = getDiscordUser;

async function isDiscordAccountPresent(discordIdHash) {
  AWS.config = new AWS.Config(config);
  let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });

  let params = {
    TableName: 'Discord',
    FilterExpression: '#discordId = :discordId',
    ExpressionAttributeNames: {
      '#discordId': 'discordId',
    },
    ExpressionAttributeValues: {
      ':discordId': discordIdHash,
    },
  };

  return docClient.scan(params).promise().then(
    (data) => {
      console.log(data);
      if (data.Items.length) {
        if (data.Items.length > 1) {
          console.log('[WARN]: Data Items is longer than one! Using first response');
        }
        return data.Items[0];
      }
      return null;
    },
    (err) => {
      console.log('[ERROR]: CHECK DISCORD IN USE RESPONSE: ', err, err.stack);
      return null;
    }
  );
}
module.exports.isDiscordAccountPresent = isDiscordAccountPresent;

async function addDiscordUser(keyHash, discordIdHash) {
  AWS.config = new AWS.Config(config);
  let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });
  
  let params = {
    TableName: 'Discord',
    Item: { licenseKey: keyHash, discordId: discordIdHash, }
  };
  await docClient.put(params).promise();
}
module.exports.addDiscordUser = addDiscordUser;

async function removeUser(keyHash) {
  AWS.config = new AWS.Config(config);
  let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });
  
  const keyId = hash(algo, keyHash, salt, output);

  const params = {
    TableName: "Users",
    Key: {
      "keyId": keyId,
    },
    Exists: true,
    ReturnConsumedCapacity: "TOTAL"
  };
  await docClient.delete(params).promise().then(
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
module.exports.removeUser = removeUser;

async function checkIsInUse(key) {
  AWS.config = new AWS.Config(config);
  const docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });
  const keyHash = hash(algo, key, salt, output);

  let params = {
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
  
  return docClient.query(params).promise().then(
    (data) => {
      console.log('[DEBUG]: CHECK IN USE RESPONSE: ', data);
      if(data.Items.length) {
        if (data.Items.length > 1) {
          console.log('[WARN]: Data Items is longer than one! Using first response');
        }
        return data.Items[0];
      }
      return null;
    },
    (err) => {
      console.log('[ERROR]: CHECK IN USE RESPONSE: ', err, err.stack);
      return null;
    }
  );
}
module.exports.checkIsInUse = checkIsInUse;

async function verifyKey(key) {
  console.log(`[TRACE]: Starting Key Verification with key: ${key} ...`);
  const keyHash = await checkValidKey(key);
  if(!keyHash) {
    console.log('[TRACE]: KEY IS INVALID, returning error...');
    return {
      error: {
        name: 'InvalidKey',
        message: 'Invalid Key',
      },
    };
  };

  const inUse = await checkIsInUse(keyHash);
  if(inUse) {
    console.log('[TRACE]: KEY IS IN USE, returning error...');
    return {
      error: {
        name: 'KeyInUse',
        message: 'Key In Use',
      },
    };
  }

  const refreshTokenPayload = await storeUser(keyHash);
  if(!refreshTokenPayload) {
    console.log('[TRACE]: UNABLE TO STORE USER, returning error...');
    return {
      error: {
        name: 'InternalError',
        message: 'Internal Error',
      },
    };
  }

  const response = generateTokens(key, refreshTokenPayload);

  console.log('[TRACE]: KEY VERIFIED: Returning Response: ', response);
  return response;
}
module.exports.verifyKey = verifyKey;

async function verifyToken(token) {
  // Attempt to Decode token
  let decoded = null;

  try {
    decoded = jwt.verify(token, SECRET_KEY, {
      issuer: process.env.NEBULA_API_ID,
      audience: 'api',
      subject: 'feref',
      clockTolerance: 60,
    });
  } catch (err) {
    // Handle decode error
    console.log('[ERROR]: JWT VERIFICATION ERROR: ', err);
    return {
      error: {
        name: 'InvalidToken',
        message: 'Token is invalid',
      },
    };
  }

  // Handle no payload...
  if(!decoded) {
    console.log('[ERROR]: JWT VERIFICATION: invalid decoding');
    return {
      error: {
        name: 'InvalidToken',
        message: 'Token is invalid',
      },
    };
  }

  console.log('[DEBUG]: JWT VERIFICIATION: Received decoded key: ', decoded);

  // Check if key is valid
  const keyHash = await checkValidKey(decoded.key);
  if(!keyHash) {
    console.log('[ERROR]: INVALID KEY!');
    return {
      error: {
        name: 'InvalidKey',
        message: 'Invalid Key',
      },
    };
  }

  // Check if key has been previously registered
  const inUse = await checkIsInUse(keyHash);
  if(!inUse) {
    console.log('[ERROR]: INVALID STATE: Key has not been registered');
    return {
      error: {
        name: 'InvalidToken',
        message: 'token is invalid',
      },
    };
  }

  console.log('[DEBUG]: Comparing payload to token now...');

  // Check if refresh payload is the same as the database
  if (decoded.ref !== inUse.refresh_token) {
    console.log('[ERROR]: INVALID STATE: Refresh token has an invalid payload');
    console.log('Database: ', inUse);
    console.log('Token: ', token);
    return {
      error: {
        name: 'InvalidToken',
        message: 'Token is invalid',
      },
    };
  }

  // Update store with new refresh payload
  const refreshTokenPayload = await storeUser(keyHash);
  if(!refreshTokenPayload) {
    console.log('[TRACE]: UNABLE TO UPDATE USER, returning error...');
    return {
      error: {
        name: 'InternalError',
        message: 'Internal Error',
      },
    };
  }

  const response = generateTokens(decoded.key, refreshTokenPayload);

  console.log('[TRACE]: KEY VERIFIED: Returning Response: ', response);
  return response;
}
module.exports.verifyToken = verifyToken;

async function deleteKey(key) {
  console.log(`[TRACE]: Starting Delete Key ${key} ...`);

  // Ensure key is valid
  const keyHash = await checkValidKey(key);
  if(!keyHash) {
    console.log('[ERROR]: INVALID KEY!');
    return {
      error: {
        name: 'InvalidKey',
        message: 'Invalid Key',
      },
    };
  }

  // Ensure key is in use
  const inUse = await checkIsInUse(keyHash);
  if(!inUse) {
    console.log('[ERROR]: INVALID STATE: Key has not been registered');
    return {
      error: {
        name: 'InternalError',
        message: 'Internal Error',
      },
    };
  }

  // Perform deletion
  const response = await deleteUser(keyHash);
  if(response) {
    return {
      response: 'success',
    };
  }

  // Handle delete error
  return {
    error: {
      name: 'InternalError',
      message: 'Internal Error',
    },
  };
}
module.exports.deleteKey = deleteKey;
