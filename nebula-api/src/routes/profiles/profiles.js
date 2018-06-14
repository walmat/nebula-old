const validateProfile = require('./validateProfile');
const AWS = require('aws-sdk');
const authenticate = require('../../middleware/authenticate');

AWS.config = {
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
}
var docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint('http://localhost:8000') });

function emptyStringsToNull(profile) {
    Object.keys(profile.shipping).forEach((key) => {
        if (!profile.shipping[key]) {
            profile.shipping[key] = null;
        }
    });
    Object.keys(profile.billing).forEach((key) => {
        if (!profile.billing[key]) {
            profile.billing[key] = null;
        }
    });
    return profile;
}

module.exports = async function(app) {
    app.get('/profiles', authenticate, async function(req, res) {
        try {
            let params = {
                TableName : 'Profiles',
                KeyConditionExpression: '#discordId = :discordId',
                ExpressionAttributeNames:{
                    '#discordId': 'discordId'
                },
                ExpressionAttributeValues: {
                    ":discordId": req.user.discordId
                }
            };

            let result = await docClient.query(params).promise();
            console.log(result);
            res.status(200).json({
                profiles: result.Items
            });
        } catch (err) {
            console.log(err);
            res.status(500).json({
                error: 'Server Error'
            });
        }

    });

    app.post('/profiles', authenticate, async function(user, req, res) {
        try {
            let profileData = req.body;
            console.log(profileData);
            let validation = validateProfile(profileData)

            if (validation.fail) {
                console.log(validation.fail);
                res.status(400);
                res.send({
                    message: 'Invalid Profile',
                    errors: validation.fail
                })
                return;
            }

            profileData = validation.success;
            profileData = emptyStringsToNull(profileData);
            profileData.discordId = user.discordId;
            console.log(profileData);

            let params = {
                TableName: 'Profiles',
                Item: profileData
            }
            await docClient.put(user, params).promise();
            console.log('Successfully saved item');
            res.status(200).json({
                result: profileData
            });
        } catch (err) {
            console.log(err);
            res.status(500).json({
                error: 'Server Error'
            });
        }
    });
};