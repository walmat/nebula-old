// Run this to set up your local dynamoDB tables necessary to develop the backend
var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000",
  accessKeyId: 'local',
  secretAccessKey: 'local'
});

var dynamodb = new AWS.DynamoDB();

var users = {
    TableName : "Users",
    KeySchema: [
        { AttributeName: "discordId", KeyType: "HASH"},  //Partition key
    ],
    AttributeDefinitions: [
        { AttributeName: "discordId", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
    }
};

var keys = {
    TableName : "Keys",
    KeySchema: [
        { AttributeName: "nebulaKey", KeyType: "HASH"},  //Partition key
    ],
    AttributeDefinitions: [
        { AttributeName: "nebulaKey", AttributeType: "S" },
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
    }
};

dynamodb.createTable(users, function(err, data) {
    if (err) {
        console.log("Error creating table users.", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table: Users.", JSON.stringify(data, null, 2));
    }
});

dynamodb.createTable(keys, function(err, data) {
    if (err) {
        console.error("Unable to create table keys. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});
