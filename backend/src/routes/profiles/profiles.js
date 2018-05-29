const dynamodb = require('../../../db.config');
const docClient = dynamodb;

const validateProfile = require('./validateProfile');

module.exports = async function(app) {
    app.get('/profiles', async function(req, res) {
        if (req.statusCode === 200) {
            let params = {
                TableName: 'profiles',
                Key: {
                    registrationKey: req.registrationKey,
                    profileName: req.profileName
                }
            };
            let result = await docClient.get(params).promise();
            return res.send(result);
        }
    });

    app.post('/profiles', async function(req, res) {
        if (req.statusCode === 200) {
            let profileData = req.body;
            let validation = validateProfile(profileData);

            if (validation.fail) {
                console.log(validation.fail);
                res.status(400);
                return res.send({
                    message: 'Invalid Profile',
                    errors: validation.fail
                });
            }

            let params = {
                TableName: 'Profiles',
                Item: profileData
            };
            let result = await docClient.put(params).promise();
            return res.send(result);
        } else {
            // return the req status code and do something with it
            return res.send(req.statusCode);
        }
    });
};