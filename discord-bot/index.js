const { prefixes, token } = require('./config.json');
const Discord = require('discord.js');

const link_builder = require('./link-builder');
const fs = require('fs');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const client = new Discord.Client();

// loads enviornment variables
dotenv.load();

client.on('ready', () => {
    console.log('Ready!');
});

client.on('guildMemberAdd', async ( member )=> {
    //revoke all permissions and give them the role of `joined`
    let role = client.guild.roles.find('name', 'joined');
    if(member.roles.has(role.id)) return;
    await(member.addRole(role.id));
});

client.on('message', async message => {

    if (message.author.bot) return;

    /* DM received to bot */
    if (message.guild === null) {
        bindUser(message);
    }
});

async function bindUser(message) {
    // get registration key and discordId from the message
    let content = message.content.split(' ');
    const registrationKey = content[1];
    const discordId = message.author.id;
    console.log(discordId);

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
                registrationKey
            })
        });

    if (result.status === 200) {
        message.channel.send(`${registrationKey} is now binded with your account`);
    } else {
        message.channel.send(`${registrationKey} is an invalid key`);
                            // So we get our messages, and delete them. Simple enough, right?
        const fetched = await message.channel.fetchMessages({count: deleteCount});
        message.channel.bulkDelete(fetched)
            .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));

    }
}

client.login(token);