const AWS = require('aws-sdk');
var config = require('../../utils/setupDynamoConfig').getConfig();
var { hash } = require('../../../hash');
const { salt, algo, output } = require('../../../hashConfig.json');

let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });

async function getLicenseKeyHash(licenseKey) {

	const licenseHash = hash(algo, licenseKey, salt, output);

	const params = {
		TableName : 'Keys',
		Key: licenseHash,
		KeyConditionExpression: '#licenseKey = :licenseKey',
		ExpressionAttributeNames:{
			'#licenseKey': 'licenseKey'
		},
		ExpressionAttributeValues: {
			":licenseKey": licenseHash
		}
	};
	const items = (await docClient.query(params).promise()).Items;

	return items.length > 0 ? items[0].licenseKey : null;
}

async function getDiscordIdAssociatedWithLicense(licenseHash, discordId) {

	const params = {
		TableName : 'Discord',
		Key: licenseHash,
		KeyConditionExpression: '#licenseKey = :licenseKey',
		ExpressionAttributeNames: {
			'#licenseKey': 'licenseKey',
			'#discordId': 'discordId'
		},
		ExpressionAttributeValues: {
			":licenseKey": licenseHash,
			":discordId": discordId
		}
	};
	const items = (await docClient.query(params).promise()).Items;

	console.log(items);

	return items.length > 0 ? items[0] : null;
}

async function addUser(licenseHash, discordId) {
	let keyData = {
		licenseKey: licenseHash,
		discordId
	}
	let params = {
		TableName: 'Discord',
		Item: keyData
	}
	await docClient.put(params).promise();
}

async function createUser(res, licenseKey, discordId) {
	// verify registration key is valid and is not being used
	const licenseHash = await getLicenseKeyHash(licenseKey);
	if (!licenseHash) {
		return res.status(404).json({
			error: 'Invalid license key or already bound'
		});
	}

	const discord = await getDiscordIdAssociatedWithLicense(licenseHash, discordId);

	// found a discord tied to the license
	if (discord) {
		return res.status(404).json({
			error: 'Invalid license key or already bound'
		});
	}

	// update key with the associated discord id and add the new user
	await addUser(licenseHash, discordId);

	return res.status(200).json({
		message: 'Key successfully bound, welcome!'
	});

}

// TODO, we eventually need to authenticate that this call only comes from the nebula bot
module.exports = function(app) {
    app.post('/user', async function(req, res) {
		try {
			const userData = req.body;
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