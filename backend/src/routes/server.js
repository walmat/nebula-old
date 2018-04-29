module.exports = function(app) {
    app.get('/server', function(req, res) {
        console.log(req.body);
    });

    app.post('/server', function(req, res) {

        console.log(req.body);
    });
};