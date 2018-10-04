var AWS = require("aws-sdk");

require('./src/utils/env').setUpEnvironment();
var config = require('./src/utils/setupDynamoConfig').getConfig();
var { hash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

AWS.config.update(config);
var dynamodb = new AWS.DynamoDB();

// module.exports = function(key) {
function storeKey(key) {
  keyHash = hash(algo, key, salt, output);

  var params = {
    Item: {
      "licenseKey": {
        S: keyHash
      }
    }, 
    ReturnConsumedCapacity: "TOTAL", 
    TableName: "Keys"
    };
    dynamodb.putItem(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else {
        getAllKeys();
        getAllDiscord();
        getAllUsers();
      }
  });
}

// storeKey('testkey');
storeKey('testkey2');

/**
 * ONLY FOR DEV USE! NEVER EVER USE IN PROD ENV
 */
async function getAllKeys() {
	try {
		let params = {
			TableName: "Keys"
		}
		let result = await dynamodb.scan(params).promise();
    console.log(result);
  } catch (err) {
    console.log(`Couldn't read the table Keys.`);
  }
}

async function getAllDiscord() {
	try {
		let params = {
			TableName: "Discord"
		}
		let result = await dynamodb.scan(params).promise();
    console.log(result);
  } catch (err) {
    console.log(`Couldn't read the table Discord.`);
  }
}

async function getAllUsers() {
	try {
		let params = {
			TableName: "Users"
		}
		let result = await docClient.scan(params).promise();
    console.log(result);
  } catch (err) {
    console.log(`Couldn't read the table Users.`);
  }
}

