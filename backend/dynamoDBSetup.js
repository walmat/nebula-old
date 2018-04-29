// Run this to set up your local dynamodb tables necessary to develop the backend
var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000",
  accessKeyId: 'local',
  secretAccessKey: 'local'
});

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName : "Profiles",
    KeySchema: [       
        { AttributeName: "registrationKey", KeyType: "HASH"},  //Partition key
        { AttributeName: "profileName", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [       
        { AttributeName: "registrationKey", AttributeType: "S" },
        { AttributeName: "profileName", AttributeType: "S" }
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 5, 
        WriteCapacityUnits: 5
    }
};

dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});