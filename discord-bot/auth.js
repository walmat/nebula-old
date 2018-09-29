const fetch = require('node-fetch');

async function bind(licenseKey, discordId, cb) {

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

    if (result.status === 200) {
        return cb(false, `${licenseKey} successfully bound`);
    } else if (result.status === 404) {
        return cb(true, `Key in use.`);
    } // otherwise send no status report to reduce clutter
}

async function deactivate(licenseKey, discordId, cb) {

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
        return cb(`${licenseKey} successfully bound`);
    } else if (result.status === process.env.KEY_IN_USE) {
        return cb(`Key: ${licenseKey} in use.`);
    } // otherwise send no status report to reduce clutter
}

async function purge(licenseKey, discordId, cb) {

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
        return cb(`${licenseKey} successfully bound`);
    } else if (result.status === process.env.KEY_IN_USE) {
        return cb(`Key: ${licenseKey} in use.`);
    } // otherwise send no status report to reduce clutter
}

module.exports = { bind, deactivate, purge };