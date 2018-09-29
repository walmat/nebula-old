// Run this to set up your local dynamoDB tables necessary to develop the backend
var AWS = require("aws-sdk");
// FOR USE IN DEV MODE ONLY!
process.env.NODE_ENV = 'development';
require('./src/utils/env').setUpEnvironment();
var config = require('./src/utils/setupDynamoConfig').getConfig();

AWS.config.update(config);
var dynamodb = new AWS.DynamoDB();

var users = {
    TableName : "Users",
    KeySchema: [
        { AttributeName: "keyId", KeyType: "HASH"},  //Partition key
    ],
    AttributeDefinitions: [
        { AttributeName: "keyId", AttributeType: "S" },
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
    }
};

var keys = {
    TableName : "Keys",
    KeySchema: [
        { AttributeName: "licenseKey", KeyType: "HASH"},  //Partition key
    ],
    AttributeDefinitions: [
        { AttributeName: "licenseKey", AttributeType: "S" },
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
