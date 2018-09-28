var AWS = require("aws-sdk");
var crypto = require('crypto');
// FOR USE IN DEV MODE ONLY!
process.env.NODE_ENV = 'development'
var config = require('./src/utils/setupDynamoConfig').getConfig();

AWS.config.update(config);

var dynamodb = new AWS.DynamoDB();

var crypto = require('crypto');
var { makeHash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

function storeUser(keyHash) {
  keyId = crypto.createHash(algo)
        .update(keyHash)
        .update(makeHash(salt))
        .digest(output);

  var params = {
    Item: {
      "keyId": {
        S: keyId
      }
    }, 
    ReturnConsumedCapacity: "TOTAL", 
    TableName: "Users"
    };
    dynamodb.putItem(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
  });
}

function removeUser(keyHash) {
  keyId = crypto.createHash(algo)
        .update(keyHash)
        .update(makeHash(salt))
        .digest(output);

  var params = {
    Item: {
      "keyId": {
        S: keyId
      }
    }, 
    ReturnConsumedCapacity: "TOTAL", 
    TableName: "Users"
    };
    dynamodb.deleteItem(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
  });
}
 module.exports = { storeUser, removeUser };