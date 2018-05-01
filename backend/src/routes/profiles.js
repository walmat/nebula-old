module.exports = function(app) {
    app.get('/profiles', function(req, res) {
        console.log(req.body);
        // grab tasks data from database eventually
        // res.send(JSON.stringify(/*db stuff here*/))
    });

    app.post('/profiles', function(req, res) {
        console.log(req.body);
        // put the task in the PouchDB
        // db.put({
        //     num: req.body.num,
        //     status: req.body.status,
        //     sku: req.body.sku,
        //     num_pairs: req.body.num_pairs
        // }).then(function (res) {
        //     console.log(res);
        // });
        // //send tasks data back to page on success
        // db.get('tasks').then(function (doc) {
        //     res.send(doc.rows);
        // }).catch(function (err) {
        //     console.log(err);
        // });
    });
};