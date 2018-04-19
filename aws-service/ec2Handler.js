const errorMessages = require('./errorMessages');
let InstanceIds = [];
let InstancePublicIps = [];

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


	let ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

	let instanceParams = {
		ImageId: 'ami-43a15f3e', 
		InstanceType: 't2.micro',
		KeyName: 'NebulaKey',
		MinCount: args[1],
		MaxCount: args[1]
	};
	console.log(`starting ${numberOfInstancesToStart} instance`);
	let ec2Response = await ec2.runInstances(instanceParams).promise();
	let Instances = ec2Response.Instances;
	console.log(`${Instances.length} started`);

	InstanceIds = InstanceIds.concat(Instances.map((Instance) => {
		return Instance.InstanceId;
	}));

	console.log(InstanceIds);

	let params = {
		InstanceIds
	}
	await ec2.waitFor('instanceRunning', params).promise();
	console.log('instances running');

	let test = await ec2.describeInstances(params).promise();
	console.log(test.Reservations[0].Instances[0]);
}

async function terminateEC2Instances(args, AWS) {
	if(args.length < 2) {
		return Promise.reject({error: errorMessages.missingArgs})
	}

	if(args.length > 2) {
		return Promise.reject({error: errorMessages.toManyArgs})
	}

	let numberOfInstancesToTerminate = parseInt(args[1]);
	if(isNaN(numberOfInstancesToTerminate)) {
		return Promise.reject({error: errorMessages.invalidArgs});
	}

	if(numberOfInstancesToTerminate > InstanceIds.length) {
		return Promise.reject({error: `Not that many EC2 Instances exist!`})
	}

	let ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

	let instanceIdsToTerminate = [];
	for(let i = 0; i < numberOfInstancesToTerminate; i++) {
		instanceIdsToTerminate.push(InstanceIds.pop());
	}

	console.log(instanceIdsToTerminate);
	let params = {
		InstanceIds: instanceIdsToTerminate
	}
	console.log('terminating instances');
	await ec2.terminateInstances(params).promise();
	await ec2.waitFor('instanceTerminated', params).promise();
	console.log('instances terminated');
}

module.exports = async function ec2Handler(command, args, AWS) {
	try {
		if(command.toLowerCase() === 'start') {
			if (args.length === 0) {
				console.log(errorMessages.missingArgs);
			} else if (args[0] === 'EC2') {
				await startEC2Instances(args, AWS);
			} else {
				console.log(errorMessages.invalidArgs);
			}
		} else if(command.toLowerCase() === 'terminate') {
			if (args.length === 0) {
				console.log(errorMessages.missingArgs);
			} else if (args[0] === 'EC2') {
				await terminateEC2Instances(args, AWS);
			} else {
				console.log(errorMessages.invalidArgs);
			}
		}
	} catch (err) {
		console.log(err);
	}
}