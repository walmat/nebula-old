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