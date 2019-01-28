function parseArgsForAWSCredentials(args) {
  const credentials = {};
  args.forEach(arg => {
    if (arg.includes('aws_access_key_id' + ':')) {
      [, credentials.accessKeyId] = arg.split(':');
    } else if (arg.includes('aws_secret_access_key:')) {
      [, credentials.secretAccessKey] = arg.split(':');
    } else if (arg.includes('region' + ':')) {
      credentials.region = arg.split(':')[1];
    }
  });
  return credentials;
}

async function verifyAWSCredentials(credentials, AWS) {
  if (!credentials.accessKeyId || !credentials.secretAccessKey || !credentials.region) {
    return Promise.reject('\x1b[31m Invalid arguments provided, exiting...\x1b[0m');
  }

  // no good way to verify credentials... https://github.com/aws/aws-sdk-php/issues/181
  AWS.config = new AWS.Config(credentials);
  const ec2 = new AWS.EC2();
  await ec2.describeInstances().promise(); // this will Promise.reject() if we can't connect with the AWS account.
}

// takes in a set of arguments and the AWS object and attempts to connect to AWS
module.exports = async function connectToAWS(args, AWS) {
  const credentials = parseArgsForAWSCredentials(args);
  await verifyAWSCredentials(credentials, AWS);
};
