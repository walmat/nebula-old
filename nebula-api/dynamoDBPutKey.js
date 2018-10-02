var AWS = require("aws-sdk");

// FOR USE IN DEV MODE ONLY!
process.env.NODE_ENV = 'production';
require('./src/utils/env').setUpEnvironment();
var config = require('./src/utils/setupDynamoConfig').getConfig();

AWS.config.update(config);

var { hash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

var dynamodb = new AWS.DynamoDB();

console.log(config.endpoint);
let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: new AWS.Endpoint(config.endpoint) });

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
storeKey('testkey3');

/**
 * ONLY FOR DEV USE! NEVER EVER USE IN PROD ENV
 */
async function getAllKeys() {
	try {
		let params = {
			TableName: "Keys"
		}
		let result = await docClient.scan(params).promise();
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
		let result = await docClient.scan(params).promise();
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

