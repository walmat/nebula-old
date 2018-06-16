module.exports = async function(app) {
    app.get('/harvester', function(req, res) {
        return res.json(captchas);
    });
};