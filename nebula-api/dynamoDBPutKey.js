var AWS = require("aws-sdk");
var crypto = require('crypto');

var config = require('./dynamoConfig.json');

AWS.config.update(config);

var dynamodb = new AWS.DynamoDB();

module.exports = function(key) {
  var key_hash = crypto.createHash('sha256').update(key).digest("hex");

  var params = {
    Item: {
      "licenseKey": {
        S: key_hash
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