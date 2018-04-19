const KEY_NAME = 'NebulaKey'

var keyPair;

exports.createKeyPair = async function(AWS) {
	try {
		let ec2 = new AWS.EC2({apiVersion: 'latest'});
		let params = {
			KeyName: KEY_NAME
		};
		keyPair = await ec2.createKeyPair(params).promise();
	} catch (err) {
		console.log(err);
		Promise.reject(err);
	}
}

exports.deleteKeyPair = async function(AWS) {
	try {
		let ec2 = new AWS.EC2({apiVersion: 'latest'});
		let params = {
			KeyName: KEY_NAME
		};
		let result = await ec2.deleteKeyPair(params).promise();
	} catch (err) {
		console.log(err);
		Promise.reject(err);
	}
}

exports.getKeyPair = function getKeyPair() {
	return keyPair;
};