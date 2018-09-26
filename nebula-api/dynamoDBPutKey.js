var AWS = require("aws-sdk");
var crypto = require('crypto');

var config = require('./dynamoConfig.json');

AWS.config.update(config);

var crypto = require('crypto');
var { makeHash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

var dynamodb = new AWS.DynamoDB();

// module.exports = function(key) {
function hash(key) {
  keyHash = crypto.createHash(algo)
        .update(key)
        .update(makeHash(salt))
        .digest(output);

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

hash('matt');