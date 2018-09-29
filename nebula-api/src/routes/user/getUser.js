const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

var config = require('../../utils/setupDynamoConfig').getConfig();

let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });

async function getNebulaUser(licenseKey) {
	// do some token shit here?
    try {
        let params = {
            TableName : 'Discord',
            Key: licenseKey,
            KeyConditionExpression: '#licenseKey = :licenseKey',
            ExpressionAttributeNames:{
                '#licenseKey': 'licenseKey'
            },
            ExpressionAttributeValues: {
                ":licenseKey": licenseKey
            }
        };
        let result = await docClient.query(params).promise();
        return result.Items.length > 0 ? result.Items[0] : null;
    } catch (err) {
        console.log('Get User', err);
    }
}

module.exports = async function(app) {
    app.get('/user', async function(req, res) {
		let licenseKeyToken = req.body.licenseKeyToken;
		// get nebula user
		let user = await getNebulaUser(licenseKeyToken);
		if (!user) {
			//invalid user, return 400
			return res.status(400).json({
				error: 'Invalid discord token'
			});
		}

		// now return a signed jwt token with the user and registation key infomration
		let token = jwt.sign({user}, process.env.NEBULA_API_JWT_SECERT, {
			expiresIn: 86400 // 24 hours
		});

        console.log(token);
		return res.status(200).json({
			auth: true,
			token
		});
    });
};