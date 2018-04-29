const errorMessages = require('./errorMessages');
const ec2SSH = require('./ec2SSH');
const fs = require('fs');
let InstanceIds = [];
let Instances = [];

async function startEC2Instances(args, AWS) {
	let userDataEncoded = fs.readFileSync('./cloud-config.yaml').toString('base64');
	console.log(userDataEncoded);
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
		MaxCount: args[1],
		SecurityGroups: ['default'],
		UserData: userDataEncoded
	};
	console.log(`starting ${numberOfInstancesToStart} instance`);
	let ec2Response = await ec2.runInstances(instanceParams).promise();
	let newInstances = ec2Response.Instances;
	console.log(`${newInstances.length} started`);

	InstanceIds = InstanceIds.concat(newInstances.map((Instance) => {
		return Instance.InstanceId;
	}));

	console.log(InstanceIds);

	let params = {
		InstanceIds
	}
	
	try {
		await ec2.waitFor('instanceRunning', params).promise();
	} catch (err) {
		err.code === 'ResourceNotReady' ? await ec2.waitFor('instanceRunning', params).promise() : Promise.reject(err);
	}
	console.log('instances running');

	// update newInstances with the latest information now that they are running
	let InstanceDescriptions = await ec2.describeInstances(params).promise();
	newInstances = InstanceDescriptions.Reservations[0].Instances;

	// now we need to create our proxies by sshing into each instance and running the squid script
	Instances = Instances.concat(newInstances);
	newInstances.forEach((Instance) => {
		console.log(Instance);
		// ec2SSH.createProxy(Instance, 'Nebula', 'Nebula');
	});
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

function createProxy() {
	console.log(Instances);
	Instances.forEach((Instance) => {
		ec2SSH.createProxy(Instance, 'Nebula', 'Nebula');
	});
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
		} else if (command.toLowerCase() === 'proxy') {
			console.log('test');
			createProxy();
		}
	} catch (err) {
		console.log(err);
	}
}