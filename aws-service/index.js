const AWS = require('aws-sdk');
const connectToAWS = require('./connectToAWS');
const readline = require('readline');

const inputStream = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function init() {
    try {
        let args = process.argv;
        await connectToAWS(args, AWS);
        console.log('Successfully connected with AWS account');
        inputStream.on('line', main);
    } catch (err) {
        //we will need to exit with a process code here telling the main service why the action failed
        console.log(err);
    }

}

const MISSING_ARGUMENTS = 'Missing Arguments!';
const TO_MANY_ARGUMENTS = 'To many Arguments!';
const INVALID_ARGUMENTS = 'Invalid Arguments!';
async function main(line) {
    let args = line.split(' ');
    let command = args.shift();
    if (command.toLowerCase() === 'exit') {
        if (args.length !== 0) {
            console.log(TO_MANY_ARGUMENTS);
            return
        } else {
            inputStream.close();
        }
    } else if (command.toLowerCase() === 'start') {
        if(args.length === 0) {
            console.log(MISSING_ARGUMENTS);
            return;
        } else if (args[0] === 'EC2') {
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
            try {
                let newInstance = await ec2.runInstances(instanceParams).promise();
                let instanceId = data.Instances[0].InstanceId;
                let stopParams = {
                    InstanceIds: [instanceId]
                }
                console.log('stopping instance');
                ec2.stopInstances(stopParams).promise();
                console.log('instance stopped');
            } catch (err) {
                console.log(err);
            }
        }
    } else if (command.toLowerCase() === 'Shutdown') {

    }
}

init();
