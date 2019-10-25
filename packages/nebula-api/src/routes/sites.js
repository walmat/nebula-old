const AWS = require('aws-sdk');
const { unwrap } = require('dynamodb-data-types').AttributeValue;

const config = require('../utils/setupDynamoConfig').getConfig();

module.exports = function setupSitesRoutes(app) {
  app.get('/sites', (_, res) => {
    const sites = [];
    AWS.config = new AWS.Config(config);
    const dynamodb = new AWS.DynamoDB();

    const params = {
      ReturnConsumedCapacity: 'TOTAL',
      TableName: 'Stores',
    };

    return dynamodb
      .scan(params)
      .promise()
      .then(data => {
        if (data && data.Items && data.Items.length) {
          data.Items.forEach(element => {
            sites.push(unwrap(element));
          });
          return res.status(200).json(sites);
        }
        return res.status(404);
      })
      .catch(err => {
        console.log(err);
        return res.status(500);
      });
  });
};
