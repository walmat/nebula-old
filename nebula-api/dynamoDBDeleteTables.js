var AWS = require("aws-sdk");
// FOR USE IN DEV MODE ONLY!
process.env.NODE_ENV = 'development'
var config = require('./src/utils/setupDynamoConfig').getConfig();

AWS.config.update(config);

var dynamodb = new AWS.DynamoDB();

console.log(config);

var params = {
    TableName : "Keys"
};

dynamodb.deleteTable(params, function(err, data) {
    if (err) {
        console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});

params.TableName = 'Users';

dynamodb.deleteTable(params, function(err, data) {
    if (err) {
        console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});
