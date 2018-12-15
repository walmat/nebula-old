const authenticate = require('../../middleware/authenticate');
const authUtils = require('./utils');

module.exports = function setupApiRoutes(app) {
  app.get('/auth', authenticate, (req, res) => {
    res.status(200).json({
      auth: true,
    });
  });

  app.delete('/auth', authenticate, async (req, res) => {
    // Get Key
    const {
      dec: { key },
    } = res.locals.jwt;

    // Attempt to Delete Key
    const response = await authUtils.deleteKey(key);

    // Handle Response
    if (response.error) {
      if (response.error.name === 'InternalError') {
        // Internal error
        return res.status(501).json(response);
      }
      // Bad request
      return res.status(400).json(response);
    }
    // Success
    return res.status(200).json(response);
  });

  app.post('/auth/token', async (req, res) => {
    // Check grant type
    const { grant_type } = req.body;
    let value = null;
    let verify = null;
    switch (grant_type) {
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
    if (!value) {
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
    if (response.error) {
      if (response.error.name === 'InternalError') {
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
