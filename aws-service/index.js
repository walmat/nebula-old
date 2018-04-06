const AWS = require('aws-sdk');
const connectToAWS = require('./connectToAWS');

async function main() {
    try {
        let args = process.argv;
        await connectToAWS(args, AWS);
        console.log('Successfully connected with AWS account');
    } catch (err) {
        //we will need to exit with a process code here telling the main service why the action failed
        console.log(err);
    }
}

main();

// awsTest(args, awsUserAccout);

// async function awsTest(args, awsUserAccount) {
//     //set process environment variables
//     process.env.AWS_ACCESS_KEY_ID = awsUserAccount.aws_access_key;
//     process.env.AWS_SECRET_ACCESS_KEY = awsUserAccount.awsSecertAccessKey;
//     process.env.AWS_REGION = awsUserAccout.region;
//     console.log('HERE1');
//     let ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

//     //create a ec2 object
//     let instanceParams = {
//         ImageId: 'ami-10fd7020', 
//         InstanceType: 't1.micro',
//         KeyName: 'KEY_PAIR_NAME',
//         MinCount: 1,
//         MaxCount: 1
//     };

//     try {
//         let newInstance = await ec2.runInstances(instanceParams).promise();
//         let instanceId = data.Instances[0].InstanceId;
//         console.log("Created instance", instanceId);
    
//         // spin down new ec2 instance
//         let stopParams = {
//             InstanceIds: [instanceId]
//         }
//         ec2.stopInstances(stopParams);
//     } catch (err) {
//         console.log(err);
//     }
// }
