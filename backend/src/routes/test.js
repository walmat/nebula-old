/*POUCH CONFIG & SETUP*/
module.exports = function(app) {
    app.get('/tasks', function(req, res) {
        console.log(req.body);
        // grab tasks data from database
        res.send({"#":1,"Status": "Running","SKU":"AC7033","Pairs": 15})
    });

    app.post('/tasks', function(req, res) {
       console.log(req.body);
       res.send('creating task');
       //put the task in the db
       // PouchDB.put({
       //     num: req.body.num,
       //     status: req.body.status,
       //     sku: req.body.sku,
       //     num_pairs: req.body.num_pairs
       // });
    });
}