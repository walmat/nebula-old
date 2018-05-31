// Run this to set up your local dynamoDB tables necessary to develop the backend
var AWS = require("aws-sdk");

AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
});

var dynamodb = new AWS.DynamoDB();

var profiles = {
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

var users = {
    TableName : "Users",
    KeySchema: [
        { AttributeName: "registrationKey", KeyType: "HASH"},  //Partition key
    ],
    AttributeDefinitions: [
        { AttributeName: "registrationKey", AttributeType: "S" }
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

dynamodb.createTable(profiles, function(err, data) {
    if (err) {
        console.error("Unable to create table profiles. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});