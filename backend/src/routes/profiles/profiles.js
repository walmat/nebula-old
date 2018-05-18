const AWS = require('aws-sdk');
const validateProfile = require('./validateProfile');

AWS.config = {
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
}
var docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint('http://localhost:8000') })


module.exports = async function(app) {
    app.get('/profiles', async function(req, res) {
        try {
            let params = {
                TableName: 'Profiles',
                Key: {
                    registrationKey: 'test',
                    profileName: 'test'
                }
            }
            let result = await docClient.get(params).promise();
            console.log(result);
        } catch (err) {
            console.log(err);
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

            let params = {
                TableName: 'Profiles',
                Item: profileData
            }
            await docClient.put(params).promise();
            console.log('Successfully saved item');
        } catch (err) {
            console.log(err);
            res.send(400); //TODO move this into a check prior to catch. This should only catch dyanmo failures (AKA server errors)
            res.send({
                message: 'Profile Name not unqiue'
            })
        }
        /*put the task data in the db*/
    });
};