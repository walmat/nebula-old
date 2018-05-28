const dynamodb = require('backend/db.config');
const docClient = dynamodb.DocumentClient();

/**
 * NEVER DELETE THE USERS TABLE!!!! EVER
 * @type {{profiles: {TableName: string}}}
 */

const tables = {
    "profiles": {
        TableName: "profiles"
    }
};
// Object.keys(tables).forEach(function (table) {
//    if (table) {
//        docClient.deleteTable(table, function (err, data) {
//            if (err) return JSON.stringify(err, null, 2);
//
//            return JSON.stringify(data, null, 2);
//        })
//    }
// });
tables.forEach(table => {
   if (table) {
       docClient.deleteTable(table, function(err, data) {
           if (err) return JSON.stringify(err, null, 2);

           return JSON.stringify(data, null, 2);
       })
   }
});