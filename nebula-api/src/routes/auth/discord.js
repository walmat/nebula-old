const authUtils = require('./utils');

async function createDiscordUser(res, userData) {

    const key = userData.licenseKey;
    const discordId = userData.discordId;
  
    const keyHash = await checkValidKey(key);
    if (!keyHash) {
      return res.status(401).json({
        name: 'MalformedRequest',
        message: 'Malformed Request'
      });
    }

    const discord = await authUtils.getDiscordUser(keyHash, discordId);

    if (discord) {
        return res.status(401).json({
            name: 'InvalidRequest',
            message: 'Invalid Request'
        })
    }

    await authUtils.addDiscordUser(keyHash, discordId);

    return res.status(200).json({
        message: 'Key successfully bound, welcome!'
    })
  
  }

module.exports = async function(app) {
    app.get('/auth/discord', function(req, res) {
        res.status(200).json({
            auth: true
        });
    });
    app.post('/auth/discord', async function(req, res) {

        const userData = req.body;

        console.log(userData);
        
        if (!userData.licenseKey || !userData.discordId) {
            res.status(404).json({
                name: 'MalformedRequest',
                message: 'Malformed Request'
            })
        } else {
            await createDiscordUser(res, userData);
        }
    });

    app.delete('/auth/discord', async function(req, res) {
        const { key } = req.body;
        if (key) {
            const response = await authUtil.verifyKey(key);
            if (response.error) {
                if (response.error.name === 'InternalError') {
                    // server error
                    return res.status(501).json(repsonse);
                }
                // auth error
                return res.status(401).json(response);
            }
            // success
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