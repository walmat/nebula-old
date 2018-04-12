const AWS = require('aws-sdk');
const connectToAWS = require('./connectToAWS');
const readline = require('readline');
const startHandler = require('./start');
const errorMessages = require('./errorMessages');

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

async function main(line) {
    try {
        let args = line.split(' ');
        let command = args.shift();
        if (command.toLowerCase() === 'exit') {
            if (args.length !== 0) {
                console.log(errorMessages.toManyArgs);
                return
            } else {
                inputStream.close();
            }
        } else if (command.toLowerCase() === 'start') {
            startHandler(args, AWS);
        } else if (command.toLowerCase() === 'Shutdown') {
    
        }
    } catch (err) {
        console.log(err);
    }
}

init();
