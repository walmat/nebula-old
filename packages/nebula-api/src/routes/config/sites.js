const AWS = require("aws-sdk");
const authenticate = require('../../middleware/authenticate');
const nebulaEnv = require('../../utils/env');
nebulaEnv.setUpEnvironment();
var config = require('../../utils/setupDynamoConfig').getConfig();
AWS.config = new AWS.Config(config);
const docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });

const LATEST_VERSION = process.env.NEBULA_API_SITES_LATEST_VERSION || "1.0.0";

async function getAllSites() {
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
    /**
     * Get the latest sitelist version
     */
    app.get('/config/sites/latest', authenticate, async (req, res) => {
        res.status(200).json({ version: LATEST_VERSION });
    });
    
    /**
     * Get a specific sitelist veresion
     */
    app.get('/config/sites/:version', authenticate, async (req, res) => {

        const version = req.params.version;
        console.log(version);
        const sites = await getAllSites(version);
        console.log(sites);
        if (sites) {
            res.status(200).json({ sites: sites });
        } else {
            res.status(404).json({
                name: 'NotFound',
                message: 'Site list not found',
            });
        }
    });

    // do not allow ANY post requests to this endpoint
    app.post('/config/sites/:version', authenticate, (req, res) => {
        res.status(403).json({ auth: false });
    });
}
