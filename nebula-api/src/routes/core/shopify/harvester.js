module.exports = async function(app) {
    app.get('/', function(req, res) {
        res.sendFile('./captcha.html', {root: __dirname});
    });
};