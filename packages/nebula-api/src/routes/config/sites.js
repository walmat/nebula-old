const authenticate = require('../../middleware/authenticate');

async function getAllSites() {
    var AWS = require("aws-sdk");
    const nebulaEnv = require('../../utils/env');
    nebulaEnv.setUpEnvironment();
    var config = require('../../utils/setupDynamoConfig').getConfig();

    AWS.config = new AWS.Config(config);
    const docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });

    AWS.config.update(config);

    try {
      let params = {
        TableName: "Sites"
      }
      let result = await docClient.scan(params).promise();
      if (result.Items.length > 0) {
        return result.Items;
      }
      return null;
    } catch (err) {
        console.log(err);
      return null;
    }
  }

module.exports = async function(app) {
    app.get('/config/sites/:version', authenticate, async (req, res) => {
        const sites = await getAllSites();
        if (sites) {
            res.status(200).json({ sites: sites });
        } else {
            res.status(404).json({
                name: 'NotFound',
                message: 'Site list not found'
            });
        }
    });

    // do not allow ANY post requests to this endpoint
    app.post('/config/sites/:version', authenticate, (req, res) => {
        res.status(403).json({ auth: false });
    });
}