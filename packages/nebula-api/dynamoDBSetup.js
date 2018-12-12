// Run this to set up your local dynamoDB tables necessary to develop the backend
var AWS = require("aws-sdk");
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

var discord = {
    TableName : "Discord",
    KeySchema: [
        { AttributeName: "licenseKey", KeyType: "HASH"}  //Partition key
    ],
    AttributeDefinitions: [
        { AttributeName: "licenseKey", AttributeType: "S" },
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

var sites = {
    TableName: "Sites",
    KeySchema: [
        { AttributeName: "name", KeyType: "HASH" }, // Partition Key

    ],
    AttributeDefinitions: [
        { AttributeName: "name", AttributeType: "S" },
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
    }
}

dynamodb.createTable(users, function(err, data) {
    if (err) {
        console.log("Error creating table users %s", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table: Users.", JSON.stringify(data, null, 2));
    }
});

dynamodb.createTable(discord, function(err, data) {
    if (err) {
        console.log("Error creating table Discord %s", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table: Discord.", JSON.stringify(data, null, 2));
    }
});

dynamodb.createTable(keys, function(err, data) {
    if (err) {
        console.error("Unable to create table Key: %s", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table: Keys.", JSON.stringify(data, null, 2));
    }
});

dynamodb.createTable(sites, function(err, data) {
    if (err) {
        console.error("Unable to create table Sites: %s", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table: Sites.", JSON.stringify(data, null, 2));
    }
});
