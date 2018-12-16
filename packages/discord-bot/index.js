const Discord = require('discord.js');
const dotenv = require('dotenv');

const { bind, deactivate, purge } = require('./auth');
// eslint-disable-next-line import/no-unresolved
const { token } = require('./config.json');

const client = new Discord.Client();

// loads enviornment variables
dotenv.load();

// helper
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

client.on('ready', () => {
  // setting the activity to show the discord bot is actively serving nebula
  client.user.setActivity(
    capitalizeFirstLetter(`${client.guilds.get('426860107054317575')}`.toLowerCase()),
  );
});

client.on('guildMemberAdd', async member => {
  // revoke all permissions and give them the role of `joined`
  const role = client.guild.roles.find('name', 'joined');
  if (member.roles.has(role.id)) return;
  await member.addRole(role.id);
});

client.on('message', async message => {
  if (message.author.bot) return; // don't allow bots to message us

  /* DM received to bot */
  if (message.guild === null) {
    const content = message.content.split(' ');

    switch (content[0]) {
      case '!bind': {
        if (content.length !== 2) {
          message.channel.send('Format: `!bind <key>`');
        }
        const licenseKey = content[1];
        const discordId = message.author.id;

        bind(licenseKey, discordId, (err, msg) => {
          if (err) {
            message.channel.send(msg);
            return; // don't give them access or anything..
          }
          // continue to grant access to discord `@member` role
          const server = client.guilds.get('426860107054317575');
          const member = server.members.get(`${discordId}`);
          const role = server.roles.find('name', 'member');
          member
            .addRole(role)
            .then(() => {
              message.channel.send(msg);
            })
            .catch(() => {
              message.channel.send('Unable to give permissions, please contact @sean#0002');
            });
        });
        break;
      }
      case '!deactivate': {
        if (content.length !== 2) {
          message.channel.send('Format: `!deactivate <key>`');
        }
        const licenseKey = content[1];
        const discordId = message.author.id;

        deactivate(licenseKey, discordId, msg => {
          message.channel.send(msg);
        });
        break;
      }
      case '!purge': {
        if (content.length !== 2) {
          message.channel.send('Not supported');
        }
        const licenseKey = content[1];
        const discordId = message.author.id;

        purge(licenseKey, discordId, msg => {
          message.channel.send(msg);
        });
        break;
      }
      case '?help': {
        message.channel.send(
          "List of commands:\n\n`!bind <key>` – binds the key to the discord user\n`!deactivate <key>` – deactivates electron app from user's machine\n`!purge <key>` – not supported (yet)",
        );
        break;
      }
      default: {
        message.channel.send(
          "Unknown Command:\nList of commands:\n\n`!bind <key>` – binds the key to the discord user\n`!deactivate <key>` – deactivates electron app from user's machine\n`!purge <key>` – not supported (yet)",
        );
      }
    }
  }
});

// bot login method
client.login(token);
