const dynamodb = require('../../backend/db.config');
const docClient = dynamodb.DocumentClient();

let user = {};

user.registerUser = function(registrationKey, discordURI, callback) {
    let params = {
        TableName: "users",
        Item: {
            "registrationKey":  registrationKey,
            "discordURI": discordURI
        }
    };

    docClient.put(params, function(err, data) {
        if (err) return callback('error', err);

        return callback(null, data);
    });

};

user.unbindUser = function(registrationKey, callback) {
    let params = {
        TableName: "users",
        Item: {
            "registrationKey": registrationKey,
            "discordURI": null
        }
    };

    docClient.update(params, function(err, data) {
        if (err) return callback('error', err);
        return callback(null, data);
    });

};

module.exports = user;