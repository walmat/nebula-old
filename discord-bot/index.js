const { token } = require('./config.json');
const Discord = require('discord.js');

const { bind, deactivate, purge } = require('./auth');

const dotenv = require('dotenv');
const fetch = require('node-fetch');
const client = new Discord.Client();

// loads enviornment variables
dotenv.load();

client.on('ready', () => {
    // setting the activity to show the discord bot is actively serving nebula
    client.user.setActivity(capitalizeFirstLetter(`${client.guilds.get("426860107054317575")}`.toLowerCase()));
});

client.on('guildMemberAdd', async ( member )=> {
    //revoke all permissions and give them the role of `joined`
    let role = client.guild.roles.find('name', 'joined');
    if(member.roles.has(role.id)) return;
    await(member.addRole(role.id));
});

client.on('message', async message => {

    if (message.author.bot) return; // don't allow bots to message us

    /* DM received to bot */
    if (message.guild === null) {
        bindUser(message);
    }
});

// helper
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// bot login method
client.login(token);