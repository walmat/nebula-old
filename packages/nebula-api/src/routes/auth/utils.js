const AWS = require('aws-sdk');
const moment = require('moment');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.NEBULA_STRIPE_KEY);

const config = require('../../utils/setupDynamoConfig').getConfig();
const { storeUser, deleteUser } = require('../../../dynamoDBUser');
const { hash } = require('../../../hash');
const { salt, algo, output } = require('../../../hashConfig.json');

const SECRET_KEY = process.env.NEBULA_API_JWT_SECRET;

function generateTokens(key, refreshPayload) {
  // Generate Access Token
  const accessToken = jwt.sign(
    {
      key,
    },
    SECRET_KEY,
    {
      issuer: process.env.NEBULA_API_ID,
      subject: 'feauth',
      audience: 'fe',
      expiresIn: '1d',
    },
  );
  const { exp } = jwt.decode(accessToken);

  // Generate Refresh token
  const refreshToken = jwt.sign(
    {
      ref: refreshPayload,
      key,
    },
    SECRET_KEY,
    {
      issuer: process.env.NEBULA_API_ID,
      subject: 'feref',
      audience: 'api',
      expiresIn: '7d',
    },
  );

  // Craft response
  const response = {
    tokenType: 'bearer',
    accessToken,
    expiry: exp,
    refreshToken,
  };
  return response;
}
module.exports.generateTokens = generateTokens;

async function removeKey(keyHash) {
  AWS.config = new AWS.Config(config);
  const dynamodb = new AWS.DynamoDB();

  const params = {
    Key: {
      licenseKey: {
        S: keyHash,
      },
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: 'Keys',
  };
  return dynamodb
    .deleteItem(params)
    .promise()
    .then(
      () => {
        console.log('[SUCCESS]: Successfully deleted key');
        return true;
      },
      err => {
        console.log('[ERROR]: ', err, err.stack);
        return false;
      },
    );
}
module.exports.removeKey = removeKey;

async function removeUser(keyHash) {
  AWS.config = new AWS.Config(config);
  const docClient = new AWS.DynamoDB.DocumentClient({
    endpoint: new AWS.Endpoint(config.endpoint),
  });

  const keyId = hash(algo, keyHash, salt, output);

  const params = {
    TableName: 'Users',
    Key: {
      keyId,
    },
    Exists: true,
    ReturnConsumedCapacity: 'TOTAL',
  };
  await docClient
    .delete(params)
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
module.exports.removeUser = removeUser;

async function removeDiscord(keyHash) {
  AWS.config = new AWS.Config(config);
  const dynamodb = new AWS.DynamoDB();

  const params = {
    Key: {
      licenseKey: {
        S: keyHash,
      },
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: 'Discord',
  };
  return dynamodb
    .deleteItem(params)
    .promise()
    .then(
      () => {
        console.log('[SUCCESS]: Successfully deleted discord');
        return true;
      },
      err => {
        console.log('[ERROR]: ', err, err.stack);
        return false;
      },
    );
}
module.exports.removeDiscord = removeDiscord;

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
      async data => {
        console.log('[DEBUG]: CHECK KEY RESPONSE: ', data);
        if (data.Items.length) {
          const { licenseKey, subscription } = data.Items[0];

          if (subscription) {
            console.log('[DEBUG]: FOUND SUBSCRIPTION %s! CHECKING...', subscription);
            try {
              const {
                status,
                current_period_end: currentPeriodEnd,
              } = await stripe.subscriptions.retrieve(subscription);

              if (status !== 'active' || status !== 'trailing') {
                console.log('[DEBUG]: SUBSCRIPTION %s EXPIRED! CHECKING BUFFER...', subscription);
                const oneMonthBuffer = moment
                  .unix(currentPeriodEnd)
                  .add(1, 'months')
                  .unix();

                // one month buffer has passed..
                // so let's completely remove the key from the database and revoke the roles from the member
                const diff = moment
                  .unix(oneMonthBuffer)
                  .diff(moment.unix(moment().unix()), 'seconds');

                console.log('[DEBUG]: SUBSCRIPTION %s EXPIRES IN %s SECONDS!', subscription, diff);
                if (diff <= 0) {
                  console.log('[DEBUG]: SUBSCRIPTION %s EXPIRED! REMOVING...', subscription);
                  await removeUser(keyHash);
                  await removeKey(keyHash);
                  await removeDiscord(keyHash);
                  // TODO: Remove roles from user using Discord.js
                }
                return null;
              }
              console.log('[DEBUG]: SUBSCRIPTION %s ACTIVE! RETURNING...', subscription);
              return licenseKey;
            } catch (error) {
              console.error('[DEBUG]: UNABLE TO RETRIEVE SUBSCRIPTION %s!', subscription);
              // if we can't get the subscription, return null?
              return null;
            }
          }
          console.log('[DEBUG]: NO SUBSCRIPTION! RETURNING...');
          // lifetime keys won't have this subscription field...
          return licenseKey;
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

async function setActiveUser(keyHash) {
  AWS.config = new AWS.Config(config);
  const docClient = new AWS.DynamoDB.DocumentClient({
    endpoint: new AWS.Endpoint(config.endpoint),
  });

  const keyId = hash(algo, keyHash, salt, output);

  const params = {
    TableName: 'Running',
    Item: {
      licenseKey: keyId,
    },
  };

  await docClient.put(params).promise();
}
module.exports.setActiveUser = setActiveUser;

async function removeActiveUser(keyHash) {
  AWS.config = new AWS.Config(config);
  const docClient = new AWS.DynamoDB.DocumentClient({
    endpoint: new AWS.Endpoint(config.endpoint),
  });

  const keyId = hash(algo, keyHash, salt, output);

  const params = {
    TableName: 'Running',
    Key: {
      keyId,
    },
    Exists: true,
    ReturnConsumedCapacity: 'TOTAL',
  };
  await docClient
    .delete(params)
    .promise()
    .then(
      () => {
        console.log('[SUCCESS]: Successfully deleted active user');
        return true;
      },
      err => {
        console.log('[ERROR]: ', err, err.stack);
        return false;
      },
    );
}
module.exports.removeActiveUser = removeActiveUser;

/**
 * Returns the discord user tied to a given key
 * @param {*} key – unmalformed license key data
 */
async function getDiscordUser(keyHash) {
  AWS.config = new AWS.Config(config);
  const docClient = new AWS.DynamoDB.DocumentClient({
    endpoint: new AWS.Endpoint(config.endpoint),
  });
  const params = {
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
  return docClient
    .query(params)
    .promise()
    .then(
      data => {
        console.log('[DEBUG]: CHECK DISCORD USER RESPONSE: ', data);
        if (data.Items.length) {
          if (data.Items.length > 1) {
            console.log('[WARN]: Data Items is longer than one! Using first response');
          }
          return data.Items[0];
        }
        return null;
      },
      err => {
        console.log('[ERROR]: CHECK DISCORD USER RESPONSE: ', err, err.stack);
        return null;
      },
    );
}
module.exports.getDiscordUser = getDiscordUser;

async function isDiscordAccountPresent(discordIdHash) {
  AWS.config = new AWS.Config(config);
  const docClient = new AWS.DynamoDB.DocumentClient({
    endpoint: new AWS.Endpoint(config.endpoint),
  });

  const params = {
    TableName: 'Discord',
    FilterExpression: '#discordId = :discordId',
    ExpressionAttributeNames: {
      '#discordId': 'discordId',
    },
    ExpressionAttributeValues: {
      ':discordId': discordIdHash,
    },
  };

  return docClient
    .scan(params)
    .promise()
    .then(
      data => {
        console.log(data);
        if (data.Items.length) {
          if (data.Items.length > 1) {
            console.log('[WARN]: Data Items is longer than one! Using first response');
          }
          return data.Items[0];
        }
        return null;
      },
      err => {
        console.log('[ERROR]: CHECK DISCORD IN USE RESPONSE: ', err, err.stack);
        return null;
      },
    );
}
module.exports.isDiscordAccountPresent = isDiscordAccountPresent;

async function addDiscordUser(keyHash, discordIdHash) {
  AWS.config = new AWS.Config(config);
  const docClient = new AWS.DynamoDB.DocumentClient({
    endpoint: new AWS.Endpoint(config.endpoint),
  });

  const params = {
    TableName: 'Discord',
    Item: { licenseKey: keyHash, discordId: discordIdHash },
  };
  await docClient.put(params).promise();
}
module.exports.addDiscordUser = addDiscordUser;

async function checkIsInUse(key) {
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
        if (data.Items.length) {
          if (data.Items.length > 1) {
            console.log('[WARN]: Data Items is longer than one! Using first response');
          }
          const item = data.Items[0];

          // If a found user has a non-expired refresh token, the key is still in use, return it
          if (!item.expiry || item.expiry > Date.now() / 1000) {
            console.log('[VERBOSE]: User found and refresh has not expired yet');
            return item;
          }
        }
        return null;
      },
      err => {
        console.log('[ERROR]: CHECK IN USE RESPONSE: ', err, err.stack);
        return null;
      },
    );
}
module.exports.checkIsInUse = checkIsInUse;

async function verifyKey(key) {
  console.log(`[TRACE]: Starting Key Verification with key: ${key} ...`);

  // [BETA]: If a found user is using the special access key, we should bypass
  // The verification and in use checks and generate jwts for them
  let keyHash = hash(algo, key, salt, output);
  if (key !== process.env.NEBULA_API_LTD_ACCESS_KEY) {
    keyHash = await checkValidKey(key);
    if (!keyHash) {
      console.log('[TRACE]: KEY IS INVALID, returning error...');
      return {
        error: {
          name: 'InvalidKey',
          message: 'Invalid Key',
        },
      };
    }

    const inUse = await checkIsInUse(keyHash);
    if (inUse) {
      console.log('[TRACE]: KEY IS IN USE, returning error...');
      return {
        error: {
          name: 'KeyInUse',
          message: 'Key In Use',
        },
      };
    }
  } else {
    console.log(`[TRACE]: LTD ACCESS KEY DETECTED: bypassing check...`);
  }

  const refreshTokenPayload = await new Promise(resolve => {
    crypto.randomBytes(48, (err, buffer) => {
      resolve(buffer.toString('hex'));
    });
  });
  const response = generateTokens(key, refreshTokenPayload);
  const { exp: expiry } = jwt.decode(response.refreshToken);

  // [BETA]: No need to store the user in the users table if they have the ltd access key
  if (key === process.env.NEBULA_API_LTD_ACCESS_KEY) {
    console.log('[TRACE]: LTD ACCESS KEY DETECTED: bypassing store user...');
  } else {
    try {
      await storeUser(keyHash, refreshTokenPayload, expiry);
    } catch (err) {
      console.log('[TRACE]: UNABLE TO STORE USER, returning error...');
      return {
        error: {
          name: 'InternalError',
          message: 'Internal Error',
        },
      };
    }
  }

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
  if (!decoded) {
    console.log('[ERROR]: JWT VERIFICATION: invalid decoding');
    return {
      error: {
        name: 'InvalidToken',
        message: 'Token is invalid',
      },
    };
  }

  console.log('[DEBUG]: JWT VERIFICIATION: Received decoded key: ', decoded);

  // [BETA]: If a found user is using the special access key, we should bypass
  // The verification and in use checks and generate jwts for them
  let keyHash = hash(algo, decoded.key, salt, output);
  if (decoded.key !== process.env.NEBULA_API_LTD_ACCESS_KEY) {
    // Check if key is valid
    keyHash = await checkValidKey(decoded.key);
    if (!keyHash) {
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
    if (!inUse) {
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
  }

  const refreshTokenPayload = await new Promise(resolve => {
    crypto.randomBytes(48, (err, buffer) => {
      resolve(buffer.toString('hex'));
    });
  });
  const response = generateTokens(decoded.key, refreshTokenPayload);
  const { exp: expiry } = jwt.decode(response.refreshToken);

  // [BETA]: No need to store the user in the users table if they have the ltd access key
  if (decoded.key === process.env.NEBULA_API_LTD_ACCESS_KEY) {
    console.log('[TRACE]: LTD ACCESS KEY DETECTED: bypassing store user...');
  } else {
    try {
      await storeUser(keyHash, refreshTokenPayload, expiry);
    } catch (err) {
      console.log('[TRACE]: UNABLE TO STORE USER, returning error...');
      return {
        error: {
          name: 'InternalError',
          message: 'Internal Error',
        },
      };
    }
  }

  console.log('[TRACE]: KEY VERIFIED: Returning Response: ', response);
  return response;
}
module.exports.verifyToken = verifyToken;

async function deleteKey(key) {
  console.log(`[TRACE]: Starting Delete Key ${key} ...`);

  // Ensure key is valid
  const keyHash = await checkValidKey(key);
  if (!keyHash) {
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
  if (!inUse) {
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
  if (response) {
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
