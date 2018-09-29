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
        console.log(req.body);
        // Check grant type
        const { grant_type } = req.body;
        let value = null;
        let verify = null;
        switch(grant_type) {
            case 'key': {
                console.log('[DEBUG]: Using key to generate access token...');
                value = req.body.key;
                verify = authUtils.verifyKey;
                break;
            }
            case 'refresh': {
                console.log('[DEBUG]: Using refresh token to generate access token...');
                value = req.body.token;
                verify = authUtils.verifyToken;
                break;
            }
            default: {
                console.log('[DEBUG]: Grant Type could not be verified');
                // Bad Request
                return res.status(400).json({
                    error: {
                        name: 'BadRequest',
                        message: 'Bad Request',
                    },
                });
            }
        }

        // Make sure value is available
        if(!value) {
            console.log('[DEBUG]: value was not given, returning 400...');
            // Bad Request
            return res.status(400).json({
                error: {
                    name: 'BadRequest',
                    message: 'Bad Request',
                },
            });
        }

        console.log('[DEBUG]: Performing verification...');
        // Perform Verification
        const response = await verify(value);

        // Handle Response
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
    });
};