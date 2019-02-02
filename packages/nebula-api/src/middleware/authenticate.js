const jwt = require('jsonwebtoken');
const authUtils = require('../routes/auth/utils');

const SECRET_KEY = process.env.NEBULA_API_JWT_SECRET;

module.exports = async function authenticateMiddleware(req, res, next) {
  // Check for authorization header to be present
  if (!req.headers || (req.headers && !req.headers.authorization)) {
    console.log('[ERROR]: Authorization header not preset! ', req.headers);
    console.log('===============================================');
    return res.status(400).json({
      error: {
        name: 'MalformedRequest',
        message: 'Malformed Request',
      },
    });
  }

  // Check for valid header format:
  const auth = req.headers.authorization;
  if (!/^Bearer (.+\..+\..+)$/.test(auth)) {
    console.log('[ERROR]: Invalid Authorization Header: ', auth);
    console.log('===============================================');
    return res.status(400).json({
      error: {
        name: 'MalformedRequest',
        message: 'Malformed Request',
      },
    });
  }

  const matches = /^Bearer (.+\..+\..+)$/.exec(auth);
  const token = matches[1]; // Get the second match since the first will be the whole input
  console.log('[DEBUG]: Parsing token: ', token);

  let decoded = null;
  try {
    decoded = jwt.verify(token, SECRET_KEY, {
      issuer: process.env.NEBULA_API_ID,
      audience: 'fe',
      subject: 'feauth',
      clockTolerance: 60,
    });
  } catch (err) {
    console.log('[ERROR]: JWT VERIFICATION ERROR: ', err);
    console.log('===============================================');
    return res.status(401).json({
      error: {
        name: 'InvalidToken',
        message: 'Token is invalid',
      },
    });
  }
  if (!decoded) {
    console.log('[ERROR]: JWT VERIFICATION ERROR: null payload');
    console.log('===============================================');
    return res.status(401).json({
      error: {
        name: 'InvalidToken',
        message: 'Token is invalid',
      },
    });
  }

  // [BETA]: If the decoded key matches the limited access key, bypass verification
  if (decoded.key !== process.env.NEBULA_API_LTD_ACCESS_KEY) {
    // Check if tokens key is valid
    const keyHash = await authUtils.checkValidKey(decoded.key);
    if (!keyHash) {
      let statusCode = 401;
      console.log(`[DEBUG]: ${req.method}`);
      if (req.method === 'DELETE') {
        statusCode = 200;
        console.log('[WARNING]: INVALID KEY! req was delete method, responding with 200 early');
        console.log('===============================================');
      } else {
        console.log('[ERROR]: INVALID KEY!');
        console.log('===============================================');
      }
      return res.status(statusCode).json({
        error: {
          name: 'InvalidToken',
          message: 'Token is invalid',
        },
      });
    }

    // Check if key is registered
    const inUse = await authUtils.checkIsInUse(keyHash);
    if (!inUse) {
      let statusCode = 403;
      console.log(`[DEBUG]: ${req.method}`);
      if (req.method === 'delete') {
        statusCode = 200;
        console.log(
          '[WARNING]: Key is not registered! req was delete method, responding with 200 early',
        );
        console.log('===============================================');
      } else {
        console.log('[ERROR]: Key is not registered!');
        console.log('===============================================');
      }
      return res.status(statusCode).json({
        error: {
          name: 'InvalidToken',
          message: 'Token is invalid',
        },
      });
    }
  } else {
    console.log('[TRACE]: LTD ACCESS KEY DETECTED: bypassing validation...');
  }

  console.log('[DEBUG]: Token is valid, continuing...');
  console.log('===============================================');
  // Save the jwt in the locals
  res.locals.jwt = {
    raw: token,
    dec: decoded,
  };
  return next();
};
