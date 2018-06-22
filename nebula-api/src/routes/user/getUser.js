const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

AWS.config = {
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
}
let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint('http://localhost:8000') });

async function getDiscordIdFromDiscordToken(discordAccessToken) {
	let response = await fetch(`https://discordapp.com/api/users/@me`,
	{
	  method: 'GET',
	  headers: {
		Authorization: `Bearer ${discordAccessToken}`,
	  },
	});

	let userInfo = await response.json();
	return userInfo && userInfo.id;
}

async function getNebulaUser(discordId) {
    try {
        // is this discordId linked with a registration key?
        let params = {
            TableName : 'Users',
            Key: discordId,
            KeyConditionExpression: '#discordId = :discordId',
            ExpressionAttributeNames:{
                '#discordId': 'discordId'
            },
            ExpressionAttributeValues: {
                ":discordId": discordId
            }
        };
        let result = await docClient.query(params).promise();
        return result.Items.length > 0 ? result.Items[0] : null;
    } catch (err) {
        console.log('Get User', err);
    }
}

module.exports = async function(app) {
    app.get('/user/:discordAccessToken', async function(req, res) {
		let discordAccessToken = req.params.discordAccessToken;
        console.log(discordAccessToken);
		let discordId = await getDiscordIdFromDiscordToken(discordAccessToken);

		if (!discordId) {
			//invalid discord token, return 400
			return res.status(400).json({
				error: 'Invalid discord token'
			});
		}

		// get nebula user
		let user = await getNebulaUser(discordId);
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