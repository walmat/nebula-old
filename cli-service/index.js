let args = process.argv;
let awsUserAccout = {};

console.log(args);
args.forEach((arg) => {
    if(arg.includes('aws_id:')) {
        awsUserAccout.awsAccessId = arg.split(':')[1];
    } else if (arg.includes('aws_secert:')) {
        awsUserAccout.awsSecretAccessKey = arg.split(':')[1];
    } else if (arg.includes('default_region:')) {
        awsUserAccout.defaultRegion = arg.split(':')[1];
    }
});

console.log(awsUserAccout);