const jwt = require('jsonwebtoken');
const authenticate = require('../../middleware/authenticate');
const authUtils = require('./utils');
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
            const response = await authUtils.verifyKey(key);
            if(response.error) {
                if(response.error.name === 'InternalError') {
                    // Internal error
                    return res.status(501).json(response);
                }
                // Authentication Error
                return res.status(401).json(response);
            }
            // Success
            return res.status(200).json(response);
        }
        // Bad Request
        return res.status(400).json({
            error: {
                name: 'BadRequest',
                message: 'Bad Request',
            },
        });
    });

    app.post('/auth/refresh', async function(req, res) {
        // Check for token
        const { token } = req.body;
        if(token) {
            const response = await authUtils.verifyToken(token);
            if(response.error) {
                if (response.error.name === 'InternalError') {
                    // Internal Error
                    return res.status(501).json(response);
                }
                // Authentication Error
                return res.status(401).json(response);
            }
            // Success
            return res.status(200).json(response);
        }
        // Bad Request
        return res.status(400).json({
            error: {
                name: 'BadRequest',
                message: 'Bad Request',
            },
        });
    })
};