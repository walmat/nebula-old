const AWS = require('aws-sdk');
AWS.config = {
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
}
let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint('http://localhost:8000') });

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
    console.log(result);
    return result.Items.length;
}

module.exports = async function(req, res, next) {
    console.log(req.body);
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