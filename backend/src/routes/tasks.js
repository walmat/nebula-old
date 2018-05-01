const PouchDB = require('PouchDB');
// const db = new PouchDB('nebula');

/*SETUP POUCH CONFIG AND SUCH*/
module.exports = function(app) {
    app.get('/tasks', function(req, res) {
        console.log(req.body);
        // grab tasks data from database eventually
        res.send({"#":1,"Status": "Running","SKU":"AC7033","Pairs": 15})
    });

    app.post('/tasks', function(req, res) {

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