const jwt = require('jsonwebtoken');
const authenticate = require('../../middleware/authenticate');
const authUtil = require('./checkKey');
const SECRET_KEY = process.env.NEBULA_API_JWT_SECRET;

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

    app.post('/auth/token', async function(req, res) {
        // Check for key
        const { key } = req.body;
        if (key) {
            const response = await authUtil.verifyKey(key);
            if(response.error) {
                if(response.error.name == 'InternalError') {
                    // Internal error
                    return res.status(501).json(repsonse);
                }
                // Authentication Error
                return res.status(401).json(response);
            }
            // Success
            return res.status(200).json(response);
        }

        return res.status(404).json({
            error: {
                name: 'MalformedRequest',
                message: 'Malformed Request',
            },
        });
    });
};