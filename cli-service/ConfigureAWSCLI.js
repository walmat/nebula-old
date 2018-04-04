const util = require('util');
const exec = util.promisify(require( 'child_process' ).exec);

module.exports  = async function configureAWSAccount(awsUserAccount) {
	try {
		cmd = await exec('aws help');
		console.log('STDOUT', cmd.stdout);
		console.log(cmd.stderr);
	} catch (err) {
		console.log(err);
	}
}