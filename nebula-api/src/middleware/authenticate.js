const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
AWS.config = {
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
}
let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint('http://localhost:8000') });

async function isValidUser(discordId, registrationKey) {
    let params = {
        TableName : 'Users',
        Key: discordId,
        KeyConditionExpression: '#discordId = :discordId',
        FilterExpression: '#registrationKey = :registrationKey',
        ExpressionAttributeNames:{
            '#discordId': 'discordId',
            '#registrationKey': 'registrationKey'
        },
        ExpressionAttributeValues: {
            ":discordId": discordId,
            ":registrationKey": registrationKey
        }
    };
    let result = await docClient.query(params).promise();
    return result.Items.length;
}

module.exports = async function(req, res, next) {
    let token = req.headers['x-access-token'];

    if (!token) {
        return res.status(401).json({
            error: {
                name: 'NoJWTProvided',
                message: 'No auth token provided'
            }
        });
    }

    jwt.verify(token, process.env.NEBULA_API_JWT_SECERT, async function(error, decoded) {
        try {
            if (error) {
                return res.status(401).json({
                    error
                });
            }

            let discordId = decoded.user.discordId;
            let registrationKey = decoded.user.registrationKey;

            if (await isValidUser(discordId, registrationKey)) {
                req.user = {
                    discordId,
                    registrationKey
                };
                return next();
            }

            return res.status(404).send({
                error: {
                    name: 'InvalidUser',
                    message: 'Not a valid user'
                }
            });
        } catch (err) {
            console.log('Authentication error: ', err);
        }

    });

};