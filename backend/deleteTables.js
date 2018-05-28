const dynamodb = require('dynamoDB.config');
const docClient = dynamodb.DocumentClient();

const tables = {
    "profiles": {
        TableName: "profiles"
    },
    "users": {
        TableName: "users"
    }
}

tables.forEach(table => {
   if (table) {
       docClient.deleteTable(table, function(err, data) {
           if (err) return JSON.stringify(err, null, 2);

           return JSON.stringify(data, null, 2);
       })
   }
});

docClient.deleteTable(params, function(err, data) {
    if (err) {
        console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});