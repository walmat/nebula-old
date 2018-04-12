
async function startEC2Instances(args, AWS) {
	//start and close ec2 for testing
	let ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

	//create a ec2 object
	let instanceParams = {
		ImageId: 'ami-10fd7020', 
		InstanceType: 't1.micro',
		KeyName: 'KEY_PAIR_NAME',
		MinCount: 1,
		MaxCount: 1
	};
	console.log('starting instance');
	let newInstance = await ec2.runInstances(instanceParams).promise();
	let instanceId = data.Instances[0].InstanceId;
	let stopParams = {
		InstanceIds: [instanceId]
	}
	console.log('stopping instance');
	ec2.stopInstances(stopParams).promise();
	console.log('instance stopped');
}

async function startECSInstances(args, AWS) {
	//start and stop ECS instances for testing
	let ecs = new AWS.ECS({apiVersion: '2014-11-13'});
}

module.exports = async function startHandler(args, AWS) {
	try {
		if (args.length === 0) {
			console.log(errorMessages.missingArgs);
			return;
		} else if (args[0] === 'EC2') {
			await startEC2Instances(args, AWS);
		} else if (args[0] === 'ECS') {
			await startECSInstances(args, AWS);
		}
	} catch (err) {
		console.log(err);
	}
}