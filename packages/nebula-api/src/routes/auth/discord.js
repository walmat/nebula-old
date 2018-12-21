const authUtils = require('./utils');
const { hash } = require('../../../hash');
const { salt, algo, output } = require('../../../hashConfig.json');

/**
 * Add an entry to the `Discord` table if:
 * a) user doesn't already have a valid key tied
 * b) key isn't already tied to another user
 * @param {*} res – response object to send a status message back
 * @param {*} userData – contains: licenseKey (non-hashed) and discordId
 */
async function createDiscordUser(res, userData) {
  const key = userData.licenseKey;
  const { discordId } = userData;

  const discordIdHash = hash(algo, discordId, salt, output);

  const keyHash = await authUtils.checkValidKey(key);
  if (!keyHash) {
    return res.status(401).json({
      name: 'Invalid Request',
      message: 'Invalid Key or Already in use.',
    });
  }

  const discord = await authUtils.getDiscordUser(keyHash);

  if (discord && discord.discordId === discordIdHash) {
    return res.status(200).json({
      name: 'Success',
      message: `You've already bound this key!`,
    });
  }
  if (discord) {
    return res.status(401).json({
      name: 'InvalidRequest',
      message: 'Invalid Key or Already in use.',
    });
  }

  const isDiscordAccountPresent = await authUtils.isDiscordAccountPresent(
    discordIdHash
  );

  if (!isDiscordAccountPresent) {
    await authUtils.addDiscordUser(keyHash, discordIdHash);

    return res.status(200).json({
      name: 'Success',
      message: 'Key Bound Successfully',
    });
  }
  return res.status(401).json({
    name: 'InvalidRequest',
    message: 'You already have a key bound.',
  });
}

/**
 * !deactivate <key> called from within the discord bot
 * @param {*} res – any response is carried along
 * @param {*} userData – contains licenseKey && discordId
 */
async function deactivateUser(res, userData) {
  const key = userData.licenseKey;
  const { discordId } = userData;

  const discordIdHash = hash(algo, discordId, salt, output);

  const keyHash = await authUtils.checkValidKey(key);

  if (!keyHash) {
    return res.status(401).json({
      name: 'MalformedRequest',
      message: 'Invalid Key',
    });
  }
  const discord = await authUtils.getDiscordUser(keyHash);

  // verify it's the proper discord user
  if (discord && discord.discordId === discordIdHash) {
    const isRemoved = await authUtils.removeUser(keyHash);

    if (!isRemoved) {
      return res.status(200).json({
        name: 'Success',
        message: 'Deactivated!',
      });
    }
    return res.status(500).json({
      name: 'InvalidRequest',
      message: 'Already deactivated.',
    });
  }
  if (discord) {
    return res.status(401).json({
      name: 'InvalidRequest',
      message: 'Invalid Key or Unauthorized',
    });
  }

  return res.status(401).json({
    name: 'InvalidRequest',
    message: 'Invalid Key or Inactive',
  });
}

module.exports = function(app) {
  app.post('/auth/discord', async (req, res) => {
    const userData = req.body;

    if (!userData.licenseKey || !userData.discordId) {
      res.status(401).json({
        name: 'MalformedRequest',
        message: 'Malformed Request',
      });
    } else {
      await createDiscordUser(res, userData);
    }
  });

  app.delete('/auth/discord', async (req, res) => {
    const userData = req.body;

    if (!userData.licenseKey || !userData.discordId) {
      res.status(401).json({
        name: 'MalformedRequest',
        message: 'Malformed Request',
      });
    } else {
      await deactivateUser(res, userData);
    }
  });
};
