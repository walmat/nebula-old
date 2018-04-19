const KEY_NAME = 'NebulaKey'

var keyPair;

exports.createKeyPair = async function(AWS) {
	let ec2 = new AWS.EC2({apiVersion: 'latest'});
	let params = {
		KeyName: KEY_NAME
	};
	keyPair = await ec2.createKeyPair(params).promise();
	console.log(keyPair);
}

exports.deleteKeyPair = async function(AWS) {
	let ec2 = new AWS.EC2({apiVersion: 'latest'});
	let params = {
		KeyName: KEY_NAME
	};
	let result = await ec2.deleteKeyPair(params).promise();
	console.log(result);
}