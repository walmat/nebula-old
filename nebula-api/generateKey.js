const shortId = require('shortid');
const AWS = require('aws-sdk');

AWS.config = {
    region: "us-west-2",
    endpoint: process.env.NEBULA_API_ENDPOINT,
    accessKeyId: 'local',
    secretAccessKey: 'local'
}
let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(process.env.NEBULA_API_ENDPOINT) });

async function generateKey() {

	// TODO - create a secure hash and make a license key based on this. Needs to be secure.
	try {
		let keyData = {
			nebulaKey: shortId.generate()
		}
		let params = {
			TableName: 'Keys',
			Item: keyData
		}
		let result = await docClient.put(params).promise();
		console.log(result);
		console.log(keyData);
	} catch (err) {
		console.log(err);
	}
}

async function seeAllKeys() {
	try {
		let params = {
			TableName: 'Keys'
		}
		let result = await docClient.scan(params).promise();
		console.log(result.Items);
	} catch (err) {

	}
}

generateKey();
seeAllKeys();