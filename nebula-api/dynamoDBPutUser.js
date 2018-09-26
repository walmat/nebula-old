var AWS = require("aws-sdk");
var crypto = require('crypto');

var config = require('./dynamoConfig.json');

AWS.config.update(config);

var dynamodb = new AWS.DynamoDB();

module.exports = function(key_hash) {
  var keyID = crypto.createHash('sha256').update(key_hash).digest("hex");

  var params = {
    Item: {
      "KeyId": {
        S: keyID
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