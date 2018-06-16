module.exports = async function(app) {
    app.get('/harvester', function(req, res) {
        res.sendFile('./captcha.html', {root: __dirname});
        console.log(res);
        // session.defaultSession.setProxy({proxyRules:""}, function () {});
    });
};