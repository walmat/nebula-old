const AWS = require('aws-sdk');
const validateProfile = require('./validateProfile');

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
    })
    return profile;
}

module.exports = async function(app) {
    app.get('/profiles/:registrationkey', async function(req, res) {
        let registrationKey = req.params['registrationkey'];
        try {
            var params = {
                TableName : 'Profiles',
                Key: registrationKey,
                KeyConditionExpression: '#regKey = :regKey',
                ExpressionAttributeNames:{
                    '#regKey': 'registrationKey'
                },
                ExpressionAttributeValues: {
                    ":regKey": registrationKey
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

    app.post('/profiles', async function(req, res) {
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
            console.log(profileData);
            profileData = emptyStringsToNull(profileData);
            console.log(profileData);

            let params = {
                TableName: 'Profiles',
                Item: profileData
            }
            await docClient.put(params).promise();
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
        /*put the task data in the db*/
    });
};