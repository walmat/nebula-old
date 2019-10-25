const AWS = require('aws-sdk');

require('./src/utils/env').setUpEnvironment();
const config = require('./src/utils/setupDynamoConfig').getConfig();

AWS.config.update(config);
const dynamodb = new AWS.DynamoDB();
const params = {
  TableName: 'Keys',
};

dynamodb.deleteTable(params, (err, data) => {
  if (err) {
    console.error('Unable to delete table. Error JSON:', JSON.stringify(err, null, 2));
  } else {
    console.log('Deleted table. Table description JSON:', JSON.stringify(data, null, 2));
  }
});

params.TableName = 'Users';

dynamodb.deleteTable(params, (err, data) => {
  if (err) {
    console.error('Unable to delete table. Error JSON:', JSON.stringify(err, null, 2));
  } else {
    console.log('Deleted table. Table description JSON:', JSON.stringify(data, null, 2));
  }
});

params.TableName = 'Discord';

dynamodb.deleteTable(params, (err, data) => {
  if (err) {
    console.error('Unable to delete table. Error JSON:', JSON.stringify(err, null, 2));
  } else {
    console.log('Deleted table. Table description JSON:', JSON.stringify(data, null, 2));
  }
});
