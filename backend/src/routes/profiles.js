const AWS = require('aws-sdk');
const Joi = require('joi');

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
            profileData.registrationKey = 'test';
            console.log(profileData);
            
            let params = {
                TableName: 'Profiles',
                Item: profileData
            }
            await docClient.put(params).promise();
            console.log('Successfully saved item');
        } catch (err) {
            console.log(err);
        }
        /*put the task data in the db*/
    });

    //the schema will be used to validate our input on the POST request
    const profilesSchema = Joi.object().keys({
        profileName: Joi.string().required(),
        shipping: Joi.object.keys({
            sFirstName: Joi.string().required().label('Shipping first name'),
            sLastName: Joi.string().required(),
            sAddress1: Joi.string().required(),
            sAddress2: Joi.string(),
            sCity: Joi.string().required(),
            sCountry: Joi.string().required(),
            sState: Joi.string(),
            sZipCode: Joi.string().required(),
            sPhone: Joi.string().required()
        })
    });
};