var AWS = require("aws-sdk");

const nebulaEnv = require('./src/utils/env');
nebulaEnv.setUpEnvironment();
var config = require('./src/utils/setupDynamoConfig').getConfig();
var { hash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

const keys = []; // add these here when we need to add keys
AWS.config.update(config);
var dynamodb = new AWS.DynamoDB();

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
  });
}

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
		let result = await dynamodb.scan(params).promise();
    console.log(result);
  } catch (err) {
    console.log(`Couldn't read the table Users.`);
  }
}

// Respond to CLI
if (process.argv.length === 3) {
  switch(process.argv[2]) {
    case '-u': {
      getAllUsers();
      break;
    }
    case '-k': {
      getAllKeys();
      break;
    }
    case '-d': {
      getAllDiscord();
      break;
    }
    case '-a': {
      // Call all here
      getAllUsers();
      getAllKeys();
      getAllDiscord();
      break;
    }
    default: {
      storeKey(process.argv[2]);
      break;
    }
  }
} else {
  keys.forEach(key => storeKey(key));
}
