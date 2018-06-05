const AWS = require('aws-sdk');
AWS.config = {
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
}
var docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint('http://localhost:8000') });

module.exports = function(app) {
    app.get('/authorization/:discordId', async function(req, res) {
		const discordId = req.params.discordId;

		// is this discordId linked with a registration key?
		var params = {
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
		console.log(result.Items);
		res.status(200).json({
			profiles: result.Items
		});
    });
};