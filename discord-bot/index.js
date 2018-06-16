const { prefixes, token } = require('./config.json');
const Discord = require('discord.js');
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
    if (message.guild === null && !message.author.bot) {
        bindUser(message);
    }

    let c = false;
    let arg_index = 0;

    for (let i = 0; i < prefixes.length; i++) {
        if (message.content.startsWith(prefixes[i])) {
            c = true;
            arg_index = i;
            break;
        }
    }

    if (c) {
        const args = message.content.slice(prefixes[arg_index].length).split(' ');
        const command = args.shift().toLowerCase();

        switch (message.channel.name) {
            case 'restocks': {
                /* Run link importer in URL mode (bot will only post links in these two formats */
                if (message.content.startsWith('http://') || message.content.startsWith('https://')) {
                    message.channel.send('early link');
                    // TODO -- /* Send link to Nebula to store as a PendingTask() */
                    /* Lots of stuff to do here. Think the bulk should be done by Nebula NOT this bot
                    * 1. Check to see if product by given link is "wanted" by user
                    * 2. See if size user wants is available
                    * 3. Add product to user's nebula's task page
                    * 4. Start the task w/ user's "restock/early link" billing profile
                    * 5. Post successful checkout to discord
                    * */
                }
                break;
            }
            /* everything else 'non-specific' */
            default: {
                // check the command and do something according to that
                switch (command) {
                    case 'config': {
                        //TODO –– /* Run bot config */
                        const author = message.author.username; //user running config
                        //TODO –– find a way to create file if it doesn't exist
                        const {config} = require('./author.json'); //user's config file
                        const sizes = [];
                        const sku = [];
                        const billings = []; //fields to track
                        if (!args.length) {
                            return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
                        } else {
                            /* Write arguments to author file */
                            if (args === 'sku') {

                            }
                        }

                        break;
                    }
                    /* Display current classes and status of those classes */
                    case 'sites': {
                        for (let i = 0; i < sites.length; i++) {
                            message.channel.send(sites[i].site + "\t–\t" + sites[i].status);
                        }
                        break;
                    }
                    case 'unbind': {
                        /* Unbind license key to discord user */
                        // this will kick the user from the discord, modify license key pair with discord user to empty
                        break;
                    }
                    case 'purge': {
                        // get the delete count, as an actual number.
                        const deleteCount = parseInt(args[0], 10);

                        // Ooooh nice, combined conditions. <3
                        if (!deleteCount || deleteCount < 2 || deleteCount > 100)
                            return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");

                        // So we get our messages, and delete them. Simple enough, right?
                        const fetched = await message.channel.fetchMessages({count: deleteCount});
                        message.channel.bulkDelete(fetched)
                            .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
                        break;
                    }
                }
            }
        }
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
    }
}

async function deleteMessage(message) {
    const fetched = await message.channel.fetchMessages({count: 1});
    message.delete(fetched)
        .catch(error => message.send(`Couldn't delete messages because of: ${error}`));
}

client.login(token);

