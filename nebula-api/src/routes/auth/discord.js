const authUtils = require('./utils');

/**
 * Add an entry to the `Discord` table if:
 * a) user doesn't already have a valid key tied
 * b) key isn't already tied to another user
 * @param {*} res – response object to send a status message back
 * @param {*} userData – contains: licenseKey (non-hashed) and discordId
 */
async function createDiscordUser(res, userData) {

    const key = userData.licenseKey;
    const discordId = userData.discordId;
  
    const keyHash = await authUtils.checkValidKey(key);
    if (!keyHash) {
      return res.status(401).json({
        name: 'Invalid Request',
        message: 'Invalid Key or Already in use.'
      });
    }

    const isDiscordAccountPresent = await authUtils.isDiscordAccountPresent(discordId);
    const discord = await authUtils.getDiscordUser(keyHash);

    if (discord && discord.discordId === discordId) {
        return res.status(200).json({
            name: 'Success',
            message: `You've already bound this key!`,
        });
    
    } else if(discord) {
        return res.status(401).json({
            name: 'InvalidRequest',
            message: 'Invalid Key or Already in use.'
        });
    }

    if (!isDiscordAccountPresent) {
        await authUtils.addDiscordUser(keyHash, discordId);

        return res.status(200).json({
            name: 'Success',
            message: 'Key Bound Successfully'
        });
    } else {
        return res.status(401).json({
            name: 'InvalidRequest',
            message: 'Invalid Key or Already in use.'
        });
    }
}

/**
 * !deactivate <key> called from within the discord bot
 * @param {*} res – any response is carried along
 * @param {*} userData – contains licenseKey && discordId
 */
async function deactivateUser(res, userData) {
    const key = userData.licenseKey;
    const discordId = userData.discordId;
    const keyHash = await authUtils.checkValidKey(key);
    console.log(keyHash);
    if (!keyHash) {
        return res.status(401).json({
            name: 'MalformedRequest',
            message: 'Invalid Key'
        });
    }
    const discord = await authUtils.getDiscordUser(keyHash);
    console.log(discord);

    // verify it's the proper discord user
    if (discord && discord.discordId === discordId) {
        await authUtils.removeUser(keyHash);

        return res.status(200).json({
            name: 'Success',
            message: 'Deactivated!'
        });
    } else {
        return res.status(401).json({
            name: 'InvalidRequest',
            message: 'Invalid Key or Inactive'
        })
    }
}

module.exports = function(app) {

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

        if(!userData.licenseKey || !userData.discordId) {
            res.status(401).json({
                name: 'MalformedRequest',
                message: 'Malformed Request'
            });
        } else {
            await deactivateUser(res, userData);
        }
    });
};
