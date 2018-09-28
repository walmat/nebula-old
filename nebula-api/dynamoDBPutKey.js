var AWS = require("aws-sdk");

// FOR USE IN DEV MODE ONLY!
process.env.NODE_ENV = 'development';
require('./src/utils/env').setUpEnvironment();
var config = require('./src/utils/setupDynamoConfig').getConfig();

AWS.config.update(config);

var { hash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

var dynamodb = new AWS.DynamoDB();

// module.exports = function(key) {
function hash(key) {
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
      else     console.log(data);           // successful response
  });
}

if (process.argv.length < 3) {
  hash('testkey');
} else {
  hash(process.argv[2]);
}
