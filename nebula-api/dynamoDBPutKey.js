var AWS = require("aws-sdk");

AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
  });

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