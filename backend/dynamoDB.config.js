let AWS = require("aws-sdk");
let fs = require('fs');

//move this later to a global config
AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});

return docClient = new AWS.DynamoDB.DocumentClient();
