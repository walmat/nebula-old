const { prefix, token } = require('./config.json');
const { sites } = require('./sites.json');
const { users } = require('./users.json');
const Discord = require('../nebula-react/node_modules/discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('Ready!');
});

client.on('message', message => {

    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const channel = message.channel.name;
    const args = message.content.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase();

    switch(channel) {
        /* for new users ONLY – binds license key to discord user */
        case 'init': {
            if (!args.length) {
                return message.channel.send("Please provide a license key.");
            } else if (args.length === 1) {
                /* check if license key is already bound and valid too */
                for (let i = 0; i < users.length; i++) {
                    if (users[i].key === args[0]) {
                        return message.channel.send("Key already in use.");
                    }
                }
                // TODO –– doesn't actually add to the JSON file. Gonna need a third party API probably..
                // add user to authenticated file
                return users.push(JSON.stringify({"name": message.author.username + "#" + message.author.discriminator, "key": args[0]}));
            }

            break;
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