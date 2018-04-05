const AWS = require('aws-sdk');
const configureAWSCLI = require('./ConfigureAWSCLI');

//Error codes
const BAD_ARGS = 1;

const AWS_ACCESS_KEY_ID = 'aws_access_key_id';
const AWS_SECERT_ACCESS_KEY = 'aws_secert_access_key';
const REGION = 'region';
console.log('HERE0');
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

awsTest(args, awsUserAccout);

async function awsTest(args, awsUserAccount) {
    //set process environment variables
    process.env.AWS_ACCESS_KEY_ID = awsUserAccount.aws_access_key;
    process.env.AWS_SECRET_ACCESS_KEY = awsUserAccount.awsSecertAccessKey;
    process.env.AWS_REGION = awsUserAccout.region;
    console.log('HERE1');
    let ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

    //create a ec2 object
    let instanceParams = {
        ImageId: 'ami-10fd7020', 
        InstanceType: 't1.micro',
        KeyName: 'KEY_PAIR_NAME',
        MinCount: 1,
        MaxCount: 1
    };

    try {
        let newInstance = await ec2.runInstances(instanceParams).promise();
        let instanceId = data.Instances[0].InstanceId;
        console.log("Created instance", instanceId);
    
        // spin down new ec2 instance
        let stopParams = {
            InstanceIds: [instanceId]
        }
        ec2.stopInstances(stopParams);
    } catch (err) {
        console.log(err);
    }
}
