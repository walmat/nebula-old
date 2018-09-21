const { prefixes, token } = require('./config.json');
const Discord = require('discord.js');

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

async function bindUser(message) {
    // get registration key and discordId from the message
    let content = message.content.split(' ');
    const licenseKey = content[1];
    const discordId = message.author.id;
    console.log(discordId);
    
    // ...some validation
    if (content.length !== 2 || !content[0].startsWith('!')) {
        return;
    }

    // call the nebula api endpoint
    let result = await fetch(`${process.env.NEBULA_API_ENDPOINT}/user`,
        {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                discordId,
                licenseKey
            }),
        });

    console.log(result);

    if (result.status === process.env.SUCCESS) {
        message.channel.send(`${licenseKey} successfully bound to your Discord account`);
    } else if (result.status === process.env.KEY_IN_USE) {
        message.channel.send(`Key: ${licenseKey} in use.`);
    } // otherwise send no status report to reduce clutter
}

// helper
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// bot login method
client.login(token);