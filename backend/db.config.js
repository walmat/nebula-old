let AWS = require("aws-sdk");

//move this later to a global config
AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: 'local',
    secretAccessKey: 'local'
});

return dynamodb = new AWS.DynamoDB();