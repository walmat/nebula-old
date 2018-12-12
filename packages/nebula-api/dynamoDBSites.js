var AWS = require("aws-sdk");
require('./src/utils/env').setUpEnvironment();
const config = require('./src/utils/setupDynamoConfig').getConfig();

async function storeSite(site) {
    AWS.config = new AWS.Config(config);
    const dynamodb = new AWS.DynamoDB();

    const params = {
      Item: {
        "name": {
          S: site.name,
        },
        "url": {
          S: site.url,
        },
        "apiKey": {
          S: site.apiKey,
        },
        "auth": {
          BOOL: site.auth,
        },
        "supported": {
          S: site.supported,
        },
        "special": {
          BOOL: site.special || false,
        },
        "sizeOptionIndex": {
          N: site.sizeOptionIndex,
        },
      }, 
      ReturnConsumedCapacity: "TOTAL", 
      TableName: "Sites"
    };
    return await dynamodb.putItem(params).promise().then(
      (data) => {
        console.log('[SUCCESS]: Successfully added new site: %s', site.name);
        return;
      },
      (err) => {
        console.log('[ERROR]: ', err, err.stack);
        return null;
      }
    );
  }

  async function deleteSite(site) {
    AWS.config = new AWS.Config(config);
    const dynamodb = new AWS.DynamoDB();
    const params = {
      Key: {
        "name": {
          S: site.name,
        },
      },
      ReturnConsumedCapacity: "TOTAL", 
      TableName: "Sites"
    };
    return await dynamodb.deleteItem(params).promise().then(
      (data) => {
        console.log('[SUCCESS]: Successfully deleted site: %s', site.name);
        return true;
      },
      (err) => {
        console.log('[ERROR]: ', err, err.stack);
        return false;
      }
    );
  }

  module.exports = { storeSite, deleteSite };
