const AWS = require('aws-sdk');
const connectToAWS = require('./connectToAWS');
const readline = require('readline');
const ec2Handler = require('./ec2Handler');
const errorMessages = require('./errorMessages');
const keyPairManager = require('./keyPairManager');

const inputStream = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function init() {
    try {
        let args = process.argv;
        await connectToAWS(args, AWS);
        console.log('Successfully connected with AWS account');

        console.log('Creating Nebula Key Pair');
        await createNebulaKeyPair(AWS);
        console.log('Created Nebula Key Pair');
        console.log(keyPairManager.getKeyPair().KeyMaterial);
        inputStream.on('line', main);
    } catch (err) {
        //we will need to exit with a process code here telling the main service why the action failed
        console.log(err);
    }

}

async function createNebulaKeyPair(AWS) {
    try {
        await keyPairManager.createKeyPair(AWS);
    } catch (err) {
        if (err.code === 'InvalidKeyPair.Duplicate') {
            try {
                await keyPairManager.deleteKeyPair(AWS);
                await keyPairManager.createKeyPair(AWS);
            } catch (err) {
                return Promise.reject(err);
            }
        } else {
            Promise.reject(err);
        }
    }
}

async function main(line) {
    try {
        let args = line.split(' ');
        let command = args.shift();
        if (command.toLowerCase() === 'exit') {
            if (args.length !== 0) {
                console.log(errorMessages.toManyArgs);
                return
            } else {
                console.log('Deleting Nebula Key Pair');
                await keyPairManager.deleteKeyPair(AWS);
                console.log('Deleted Nebula Key Pair');
                inputStream.close();
            }
        } else {
            await ec2Handler(command, args, AWS);
        }
    } catch (err) {
        console.log(err);
    }
}

init();
