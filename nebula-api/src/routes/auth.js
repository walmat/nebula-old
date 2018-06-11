const authenticate = require('../middleware/authenticate');

module.exports = async function(app) {
    app.get('/auth', authenticate, function(req, res) {
        console.log('HEY');
        res.status(200).json({
            auth: true
        });
    });
};