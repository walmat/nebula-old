const shortId = require('shortid');
const AWS = require('aws-sdk');
AWS.config = {
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
}
let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint('http://localhost:8000') });


async function generateKey() {
	try {
		let keyData = {
			registrationKey: shortId.generate()
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