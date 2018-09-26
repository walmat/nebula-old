var AWS = require("aws-sdk");

var config = require('./dynamoConfig.json');

AWS.config.update(config);

var dynamodb = new AWS.DynamoDB();


var params = {
    Item: {
     "licenseKey": {
       S: "BetaTest1"
      }
    }, 
    ReturnConsumedCapacity: "TOTAL", 
    TableName: "Keys"
   };
   dynamodb.putItem(params, function(err, data) {
     if (err) console.log(err, err.stack); // an error occurred
     else     console.log(data);           // successful response
   });