const AWS = require('aws-sdk');
var config = require('../../dynamoConfig.json');
AWS.config.update(config);

var { storeUser } = require('../../dynamoDBUser');
var crypto = require('crypto');
var { makeHash } = require('../../hash');
const { salt, algo, output } = require('../../hashConfig.json');

let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });

async function getValidKey(licenseKey) {
    licenseKeyHash = crypto.createHash(algo)
        .update(licenseKey)
        .update(makeHash(salt))
        .digest(output);
    let params = {
        TableName : 'Keys',
        Key: licenseKeyHash,
        KeyConditionExpression: '#licenseKey = :licenseKey',
        ExpressionAttributeNames: {
            '#licenseKey': 'licenseKey'
        },
        ExpressionAttributeValues: {
            ":licenseKey": licenseKeyHash
        }
    };
    let result = await docClient.query(params).promise();
    return result.Items[0].licenseKey;
}

async function isInUse(licenseHash) {
    console.log(licenseHash);
    keyIdHash = crypto.createHash(algo)
        .update(licenseHash)
        .update(makeHash(salt))
        .digest(output);
    let params = {
        TableName : 'Users',
        Key: keyIdHash,
        KeyConditionExpression: '#keyId = :keyId',
        ExpressionAttributeNames: {
            '#keyId': 'keyId'
        },
        ExpressionAttributeValues: {
            ":keyId": keyIdHash
        }
    };
    let result = await docClient.query(params).promise();
    return result.Items.length;
}

module.exports = async function(req, res, next) {
    try {
        let licenseKey = req.body.license;
        let key = await getValidKey(licenseKey);
        if (key) {
            if (await isInUse(key) === 0) {
                storeUser(key);
                return next();
            } else {
                return res.status(404).send({
                    error: {
                        name: 'KeyInUse',
                        message: 'Key In Use'
                    }
                });
            }
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