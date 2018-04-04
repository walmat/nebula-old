const configureAWSCLI = require('./ConfigureAWSCLI');

//Error codes
const BAD_ARGS = 1;

const AWS_ACCESS_KEY_ID = 'aws_access_key_id';
const AWS_SECERT_ACCESS_KEY = 'aws_secert_access_key';
const REGION = 'region';

let args = process.argv;
let awsUserAccout = {};

console.log(args);
args.forEach((arg) => {
    if(arg.includes(AWS_ACCESS_KEY_ID + ':')) {
        awsUserAccout.awsAccessKeyId = arg.split(':')[1];
    } else if (arg.includes(AWS_SECERT_ACCESS_KEY + ':')) {
        awsUserAccout.awsSecertAccessKey = arg.split(':')[1];
    } else if (arg.includes(REGION + ':')) {
        awsUserAccout.region = arg.split(':')[1];
    }
});

console.log(awsUserAccout);

//check that approriate arguments where passed in
if(!awsUserAccout.awsAccessKeyId || !awsUserAccout.awsSecertAccessKey || !awsUserAccout.region) {
    console.error('\x1b[31m Invalid arguments provided, exiting...\x1b[0m');
    process.exit(BAD_ARGS);
}

configureAWSCLI(awsUserAccout);