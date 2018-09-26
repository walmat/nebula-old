const AWS = require('aws-sdk');
var config = require('../../dynamoConfig.json');
AWS.config.update(config);

let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });

async function isValidKey(licenseKey) {
    let params = {
        TableName : 'Keys',
        Key: licenseKey,
        KeyConditionExpression: '#licenseKey = :licenseKey',
        ExpressionAttributeNames: {
            '#licenseKey': 'licenseKey'
        },
        ExpressionAttributeValues: {
            ":licenseKey": licenseKey
        }
    };
    let result = await docClient.query(params).promise();
    return result.Items.length;
}

module.exports = async function(req, res, next) {
    try {
        let licenseKey = req.body.license;
        if (await isValidKey(licenseKey)) {
            return next();
        }
        return res.status(404).send({
            error: {
                name: 'InvalidKey',
                message: 'Invalid Key'
            }
        });
    } catch (err) {
        console.log('Authentication error: ', err);
    }
};