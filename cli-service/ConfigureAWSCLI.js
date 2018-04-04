const util = require('util');
const exec = util.promisify(require( 'child_process' ).exec);

module.exports  = async function configureAWSAccount(awsUserAccount) {
	try {
		cmd = await exec(`aws configure\n\r${awsUserAccount.aws_access_key}\n\r${awsUserAccount.awsSecertAccessKey}\n\r${awsUserAccount.region}\n\r`);
		console.log('STDOUT', cmd.stdout);
		console.log(cmd.stderr);
	} catch (err) {
		console.log(err);
	}
}