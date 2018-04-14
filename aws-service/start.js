const errorMessages = require('./errorMessages');

async function startEC2Instances(args, AWS) {
	if(args.length < 2) {
		return Promise.reject({error: errorMessages.missingArgs})
	}

	if(args.length > 2) {
		return Promise.reject({error: errorMessages.toManyArgs})
	}

	let numberOfInstancesToStart = parseInt(args[1]);
	if(isNaN(numberOfInstancesToStart)) {
		return Promise.reject({error: errorMessages.invalidArgs});
	}
	//start and close ec2 for testing
	let ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

	//create a ec2 object
	let instanceParams = {
		ImageId: 'ami-43a15f3e', 
		InstanceType: 't2.micro',
		KeyName: 'test', //TODO, this needs to be passed in somehow
		MinCount: args[1],
		MaxCount: args[1]
	};
	console.log(`starting ${numberOfInstancesToStart} instance`);
	let ec2Response = await ec2.runInstances(instanceParams).promise();
	let Instances = ec2Response.Instances;
	console.log(`${Instances.length} started`);

	let InstanceIds = Instances.map((Instance) => {
		return Instance.InstanceId;
	});

	let params = {
		InstanceIds
	}
	await ec2.waitFor('instanceRunning', params).promise();
	console.log('instance running');

	console.log('stopping instance');
	await ec2.stopInstances(params).promise();
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