const { prefix, token } = require('./config.json');
const { sites } = require('./sites.json');
const fs = require('./node_modules/fs.realpath');
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('Ready!');
});

client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const channel = message.channel.name;
    const args = message.content.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase();
    /* Run the two monitor link checks to send to nebula */
    if (channel === 'restocks') {
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
            /* there must be an error somewhere, handle it somehow */
        }
    }
    /* Run all commands outside of the two monitoring channels */
    else if (channel !== 'restocks' || channel !== 'early-links') {
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