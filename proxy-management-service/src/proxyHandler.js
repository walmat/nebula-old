const errorMessages = require('./errorMessages');
const ec2SSH = require('./ec2SSH');
const fs = require('fs');
let Instances = [];

async function startProxies(args, AWS) {
	let userDataEncoded = fs.readFileSync('./src/cloud-config.yaml').toString('base64');

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

	// create our proxies
	console.log(`creating ${numberOfInstancesToStart} proxies`);
	let ec2Response = await ec2.runInstances(instanceParams).promise();
	let newInstances = ec2Response.Instances;
	console.log(`${newInstances.length} created`);


	// wait for our new proxies to be running
	let InstanceIds = newInstances.map((Instance) => {
		return Instance.InstanceId;
	});

	let params = {
		InstanceIds
	}
	
	try {
		await ec2.waitFor('instanceRunning', params).promise();
	} catch (err) {
		err.code === 'ResourceNotReady' ? await ec2.waitFor('instanceRunning', params).promise() : Promise.reject(err);
	}
	console.log('New proxies running');

	// update newInstances with the latest information now that they are running
	let InstanceDescriptions = await ec2.describeInstances(params).promise();
	newInstances = InstanceDescriptions.Reservations[0].Instances;
	Instances = Instances.concat(newInstances);

	// TODO: Save the ip addresses of all the active running proxies to a file

	// DEBUG
	newInstances.forEach((Instance) => {
		console.log(Instance);
	});
}

async function terminateProxies(args, AWS) {
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

	if(numberOfInstancesToTerminate > Instances.length) {
		return Promise.reject({error: `Not that many EC2 Instances exist!`})
	}

	let ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

	let instanceIdsToTerminate = [];
	for(let i = 0; i < numberOfInstancesToTerminate; i++) {
		instanceIdsToTerminate.push(Instances.pop().InstanceId);
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
			} else if (args[0] === 'proxies') {
				await startProxies(args, AWS);
			} else {
				console.log(errorMessages.invalidArgs);
			}
		} else if(command.toLowerCase() === 'terminate') {
			if (args.length === 0) {
				console.log(errorMessages.missingArgs);
			} else if (args[0] === 'proxies') {
				await terminateProxies(args, AWS);
			} else {
				console.log(errorMessages.invalidArgs);
			}
		}
	} catch (err) {
		console.log(err);
	}
}