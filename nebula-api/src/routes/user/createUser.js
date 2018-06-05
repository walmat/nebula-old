const AWS = require('aws-sdk');
AWS.config = {
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
}
var docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint('http://localhost:8000') });

async function getRegistationKey(registrationKey) {
	const params = {
		TableName : 'Keys',
		Key: registrationKey,
		KeyConditionExpression: '#registrationKey = :registrationKey',
		ExpressionAttributeNames:{
			'#registrationKey': 'registrationKey'
		},
		ExpressionAttributeValues: {
			":registrationKey": registrationKey
		}
	};
	const items = (await docClient.query(params).promise()).Items;
	return items.length > 0 ? items[0] : null;
}

async function updateKeyWithDiscordUser(registrationKey, discordId) {
	let keyData = {
		registrationKey,
		discordId
	}
	let params = {
		TableName: 'Keys',
		Item: keyData
	}
	await docClient.put(params).promise();
}

async function addUser(registrationKey, discordId) {
	let keyData = {
		registrationKey,
		discordId
	}
	let params = {
		TableName: 'Users',
		Item: keyData
	}
	await docClient.put(params).promise();
}

async function createUser(res, registrationKey, discordId) {
	// verify registration key is valid and is not being used
	const savedRegistationKey = await getRegistationKey(registrationKey);
	if (!savedRegistationKey) {
		return res.send(404).json({
			error: 'Invalid registration key!'
		});
	}

	if (savedRegistationKey.discordId) {
		return res.send(404).json({
			error: 'Registration key in use!'
		});
	}

	await updateKeyWithDiscordUser(registrationKey, discordId);
	await addUser(registrationKey, discordId);

	return res.status(200).json({
		message: 'User added'
	});

}

// TODO, we eventually need to authenticate that this call only comes from the nebula bot
module.exports = function(app) {
    app.post('/user', async function(req, res) {
		try {
			const userData = req.body;
			console.log(userData);
			if (!userData.registrationKey || !userData.discordId) {
				res.status(404).json({
					error: 'Missing registration key or discordId!'
				});
			} else {
				return await createUser(res, userData.registrationKey, userData.discordId);
			}
		} catch (err) {
			console.log(err);
			return res.status(500);
		}
	});
};