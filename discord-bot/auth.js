const { prefixes } = require('./config.json');
const fetch = require('node-fetch');

async function bind(message) {
    // get registration key and discordId from the message
    let content = message.content.split(' ');
    const licenseKey = content[1];
    const discordId = message.author.id;
    console.log(discordId);
    
    // ...some validation
    if (content.length !== 2 || !content[0].startsWith(prefixes[0])) {
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

async function deactivate(message) {
    // get registration key and discordId from the message
    let content = message.content.split(' ');
    const licenseKey = content[1];
    const discordId = message.author.id;
    console.log(discordId);
    
    // ...some validation
    if (content.length !== 2 || !content[0].startsWith(prefixes[0])) {
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

async function purge(message) {
    // get registration key and discordId from the message
    let content = message.content.split(' ');
    const licenseKey = content[1];
    const discordId = message.author.id;
    console.log(discordId);
    
    // ...some validation
    if (content.length !== 2 || !content[0].startsWith(prefixes[0])) {
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

module.exports = { bind, deactivate, purge };