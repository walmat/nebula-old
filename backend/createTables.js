// Run this to set up your local dynamoDB tables necessary to develop the backend
const dynamodb = require('dynamoDB.config');
const docClient = dynamodb.DocumentClient();

const tables = {
    "profiles": {
        TableName: "profiles",
        KeySchema: [
            {AttributeName: "registrationKey", KeyType: "HASH"},  //Partition key
            {AttributeName: "profileName", KeyType: "RANGE"}  //Sort key
        ],
        AttributeDefinitions: [
            {AttributeName: "registrationKey", AttributeType: "S"},
            {AttributeName: "profileName", AttributeType: "S"}
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    },
    "users": {
        TableName: "users",
        KeySchema: [
            { AttributeName: "registrationKey", KeyType: "HASH"},  //Partition key
        ],
        AttributeDefinitions: [
            { AttributeName: "registrationKey", AttributeType: "S" },
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    }
}

tables.forEach(table => {
    docClient.createTable(table, function(err, data) {
        if (err) {
            JSON.stringify(err, null, 2);
        } else {
            JSON.stringify(data, null, 2);
        }
    })
});