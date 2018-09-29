const authUtils = require('./utils');

async function createDiscordUser(res, userData) {

    const key = userData.licenseKey;
    const discordId = userData.discordId;
  
    const keyHash = await authUtils.checkValidKey(key);
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
        name: 'Success',
        message: 'Key Bound Successfully'
    })
}

/**
 * 
 * @param {*} res – any response is carried along
 * @param {*} userData – contains licenseKey && discordId
 */
async function deactivateUser(res, userData) {

    const key = userData.licenseKey;
    const discordId = userData.discordId;
    const keyHash = await authUtils.checkValidKey(key);
    if (!keyHash) {
        return res.status(401).json({
            name: 'MalformedRequest',
            message: 'Malformed Request'
        });
    }

    const discord = await authUtils.getDiscordUser(keyHash, discordId);

    // verify it's the proper discord user
    if (!discord) {
        return res.status(401).json({
            name: 'InvalidRequest',
            message: 'Invalid Request'
        })
    }

    await authUtils.removeUser(keyHash);

    return res.status(200).json({
        name: 'Success',
        message: 'Deactivated!'
    });
}

module.exports = async function(app) {
    app.get('/auth/discord', function(req, res) {
        res.status(200).json({
            auth: true
        });
    });
    app.post('/auth/discord', async function(req, res) {

        const userData = req.body;
        
        if (!userData.licenseKey || !userData.discordId) {
            res.status(401).json({
                name: 'MalformedRequest',
                message: 'Malformed Request'
            })
        } else {
            await createDiscordUser(res, userData);
        }
    });

    app.delete('/auth/discord', async function(req, res) {
        const userData = req.body;

        if (!userData.licenseKey || !userData.discordId) {
            res.status(401).json({
                name: 'MalformedRequest',
                message: 'Malformed Request'
            })
        } else {
            await deactivateUser(res, userData);
        }
    });
};