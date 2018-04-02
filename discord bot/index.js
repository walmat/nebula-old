const { prefix, token } = require('./config.json');
const { sites } = require('./sites.json');
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
            message.channel.send('link detected');
        } else {
            /* there must be an error somewhere, handle it somehow */
        }
    }
    /* Run all commands outside of the two monitoring channels */
    else if (channel !== 'restocks' || channel !== 'early-links') {
        switch(command) {
            case 'config': {
                /* Run bot config */
                const author = message.author.username; //user running config
                const sizes = []; const sku = []; const billings = []; //fields to modify
                if (!args.length) {
                    return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
                }
                break;
            }
            case 'sites': {
                message.channel.send('Currently monitoring: \n');
                const site_array = JSON.parse(sites);
                for (let i = 0; i < site_array.length; i++) {
                    message.channel.send(site_array);
                }
                break;
            }
        }
    }
});

client.login(token);