// Run this to set up your local dynamoDB tables necessary to develop the backend
const AWS = require('aws-sdk');
require('./src/utils/env').setUpEnvironment();
const config = require('./src/utils/setupDynamoConfig').getConfig();

AWS.config.update(config);
const dynamodb = new AWS.DynamoDB();

const users = {
  TableName: 'Users',
  KeySchema: [
    { AttributeName: 'keyId', KeyType: 'HASH' }, // Partition key
  ],
  AttributeDefinitions: [{ AttributeName: 'keyId', AttributeType: 'S' }],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};

const discord = {
  TableName: 'Discord',
  KeySchema: [
    { AttributeName: 'licenseKey', KeyType: 'HASH' }, // Partition key
  ],
  AttributeDefinitions: [{ AttributeName: 'licenseKey', AttributeType: 'S' }],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};

const keys = {
  TableName: 'Keys',
  KeySchema: [
    { AttributeName: 'licenseKey', KeyType: 'HASH' }, // Partition key
  ],
  AttributeDefinitions: [{ AttributeName: 'licenseKey', AttributeType: 'S' }],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};

dynamodb.createTable(users, (err, data) => {
  if (err) {
    console.log('Error creating table users.', JSON.stringify(err, null, 2));
  } else {
    console.log('Created table: Users.', JSON.stringify(data, null, 2));
  }
});

dynamodb.createTable(discord, (err, data) => {
  if (err) {
    console.log('Error creating table Discord.', JSON.stringify(err, null, 2));
  } else {
    console.log('Created table: Discord.', JSON.stringify(data, null, 2));
  }
});

dynamodb.createTable(keys, (err, data) => {
  if (err) {
    console.error('Unable to create table Key.', JSON.stringify(err, null, 2));
  } else {
    console.log('Created table: Keys.', JSON.stringify(data, null, 2));
  }
});
