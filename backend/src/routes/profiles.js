let AWS = require('aws-sdk');
let dyanmoDB = new AWS.DynamoDB({ endpoint: new AWS.Endpoint('http://localhost:8000') });


module.exports = function(app) {
    app.get('/profiles', function(req, res) {
        console.log(req.body);
        // grab tasks data from database eventually
        // res.send(JSON.stringify(/*db stuff here*/))
    });

    app.post('/profiles', function(req, res) {
        console.log(req.body);
        /*put the task data in the db*/
    });
};