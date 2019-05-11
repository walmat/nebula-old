const AWS = require('aws-sdk');
const nebulaEnv = require('./src/utils/env');

nebulaEnv.setUpEnvironment();
const config = require('./src/utils/setupDynamoConfig').getConfig();
const { hash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

const keys = []; // add these here when we need to add keys
AWS.config.update(config);
const dynamodb = new AWS.DynamoDB();

function storeKey(key) {
  const keyHash = hash(algo, key, salt, output);

  const params = {
    Item: {
      licenseKey: {
        S: keyHash,
      },
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: 'Keys',
  };
  dynamodb.putItem(params, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
  });
}

async function getAllKeys() {
  try {
    const params = {
      TableName: 'Keys',
    };
    const result = await dynamodb.scan(params).promise();
    result.Items.forEach(key => console.log(key));
  } catch (err) {
    console.log(`Couldn't read the table Keys.`);
  }
}

async function getAllDiscord() {
  try {
    const params = {
      TableName: 'Discord',
    };
    const result = await dynamodb.scan(params).promise();
    result.Items.forEach(discord => console.log(discord));
  } catch (err) {
    console.log(`Couldn't read the table Discord.`);
  }
}

async function getAllUsers() {
  try {
    const params = {
      TableName: 'Users',
    };
    const result = await dynamodb.scan(params).promise();
    result.Items.forEach(user => console.log(user));
  } catch (err) {
    console.log(`Couldn't read the table Users.`);
  }
}

// Respond to CLI
if (process.argv.length === 3) {
  switch (process.argv[2]) {
    case '-u': {
      getAllUsers();
      break;
    }
    case '-k': {
      getAllKeys();
      break;
    }
    case '-d': {
      getAllDiscord();
      break;
    }
    case '-a': {
      // Call all here
      getAllUsers();
      getAllKeys();
      getAllDiscord();
      break;
    }
    default: {
      storeKey(process.argv[2]);
      break;
    }
  }
} else {
  keys.forEach(key => storeKey(key));
}
