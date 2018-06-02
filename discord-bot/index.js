const { prefix, token } = require('./config.json');
const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('Ready!');
});

client.on('message', async message => {

    /* must be a DM – handle authenticating user */
    if (message.guild === null) {
        console.log(`${message.author.username}#${message.author.discriminator}`);
        console.log(message.author.id); //THIS IS THE UID WE'D STORE

    }

    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const channel = message.channel.name;
    const args = message.content.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase();

    switch(channel) {
        /* for new users ONLY – binds license key to discord user */
        case 'init': {

        }
        /* Run the two monitor link checks to send to nebula */
        case 'early-links':
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
            } else {
                /* there must be an error somewhere, handle it here */
            }
            break;
        }
        /* everything else 'non-specific' */
        default: {
            // check the command and do something according to that
            switch(command) {
                case 'config': {
                    //TODO –– /* Run bot config */
                    const author = message.author.username; //user running config
                    //TODO –– find a way to create file if it doesn't exist
                    const { config } = require('./author.json'); //user's config file
                    const sizes = []; const sku = []; const billings = []; //fields to track
                    if (!args.length) {
                        return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
                    } else {
                        /* Write arguments to author file */
                        if (args === 'sku') {

                        }
                    }

                    break;
                }
                /* Display current sites and status of those sites */
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
                    if(!deleteCount || deleteCount < 2 || deleteCount > 100)
                        return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");

                    // So we get our messages, and delete them. Simple enough, right?
                    const fetched = await message.channel.fetchMessages({count: deleteCount});
                    message.channel.bulkDelete(fetched)
                        .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
                    break;
                }
            }
           break;
        }
    }
});

client.login(token);

Object.size = function(obj) {
    let size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
