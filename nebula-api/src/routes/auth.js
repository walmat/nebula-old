const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/authenticate');

const SECRET_KEY = 'shhhhhhItsasecret';

module.exports = async function(app) {
    app.get('/auth', authenticate, function(req, res) {
        res.status(200).json({
            auth: true
        });
    });
    app.post('/auth', authenticate, function(req, res) {
        // TODO: generate random id
        console.log('key success');
        const { key } = req.body;
        const token = jwt.sign({ key }, SECRET_KEY, { expiresIn: '2d' });
        const { exp } = jwt.decode(token);
        console.log(token);
        res.status(200).json({
            data: {
                id: 1,
                attributes: {
                    token,
                    expiry: exp,
                },
            },
        });
    });
};