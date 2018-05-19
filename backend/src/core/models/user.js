let docClient = require('../dynamoDB.config');

let user = {};

user.registerUser = function(registrationKey, discordURI, discordName) {
    let params = {
        TableName: "users",
        Item: {
            "registrationKey":  registrationKey,
            "discordURI": discordURI
        }
    };

    docClient.put(params, function(err, data) {
        if (err) console.log("error storing user in the table..", JSON.stringify(err, null, 2));

        else {
            console.log('welcome to nebula ' + discordName, JSON.stringify(data, null, 2));
        }
    });

};

user.unbindUser = function(registrationKey) {
    let params = {
        TableName: "users",
        Item: {
            "registrationKey": registrationKey,
            "discordURI": null
        }
    };

    docClient.update(params, function(err, data) {
       if (err) console.log("error unbinding key..", JSON.stringify(err, null, 2));
       else {
           console.log("successfully unbound license key.", JSON.stringify(data, null, 2));
       }
    });

};

module.exports = user;