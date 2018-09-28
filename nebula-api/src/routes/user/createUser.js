const AWS = require('aws-sdk');
var config = require('../../utils/setupDynamoConfig').getConfig();

let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });

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
		return res.status(404).json({
			error: 'Invalid registration key!'
		});
	}

	if (savedRegistationKey.discordId) {
		return res.status(404).json({
			error: 'Registration key in use!'
		});
	}

	// update key with the associated discord id and add the new user
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
			if (!userData.licenseKey || !userData.discordId) {
				res.status(404).json({
					error: 'Missing registration key or discordId!'
				});
			} else {
				await createUser(res, userData.licenseKey, userData.discordId);
			}
		} catch (err) {
			console.log(err);
			return res.status(500);
		}
	});
};