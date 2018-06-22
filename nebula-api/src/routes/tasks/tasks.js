module.exports = function(app) {
    app.get('/tasks', function(req, res) {
        console.log(req.body);
    });

    app.post('/tasks', function(req, res) {
        console.log(req.body);
    });
};