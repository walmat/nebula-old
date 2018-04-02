const { prefix, token } = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('Ready!');
});

client.on('message', message => {
    if (message.content.startsWith('http://') || message.content.startsWith('https://')) {
    	message.channel.send('link detected');
	}
});

client.login(token);