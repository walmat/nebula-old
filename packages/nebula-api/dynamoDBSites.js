let AWS = require('aws-sdk');
require('./src/utils/env').setUpEnvironment();
const config = require('./src/utils/setupDynamoConfig').getConfig();

async function storeSite(site) {
  AWS.config = new AWS.Config(config);
  const dynamodb = new AWS.DynamoDB();

  const params = {
    Item: {
      label: {
        S: site.label,
      },
      value: {
        S: site.value,
      },
      apiKey: {
        S: site.apiKey,
      },
      auth: {
        S: site.auth,
      },
      supported: {
        S: site.supported,
      },
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: 'Sites',
  };
  return await dynamodb
    .putItem(params)
    .promise()
    .then(
      data => {
        console.log('[SUCCESS]: Successfully added new site: %s', site.label);
        return;
      },
      err => {
        console.log('[ERROR]: ', err, err.stack);
        return null;
      },
    );
}

async function deleteSite(site) {
  AWS.config = new AWS.Config(config);
  const dynamodb = new AWS.DynamoDB();
  const params = {
    Key: {
      label: {
        S: site.label,
      },
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: 'Sites',
  };
  return await dynamodb
    .deleteItem(params)
    .promise()
    .then(
      data => {
        console.log('[SUCCESS]: Successfully deleted site: %s', site.label);
        return true;
      },
      err => {
        console.log('[ERROR]: ', err, err.stack);
        return false;
      },
    );
}

module.exports = { storeSite, deleteSite };
