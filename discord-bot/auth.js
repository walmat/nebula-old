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

    if (result.status === 200) {
        return cb(false, `${licenseKey} successfully bound`);
    } else if (result.status === 404) {
        return cb(true, `Invalid key, or already in use.`);
    } // otherwise send no status report to reduce clutter
}

async function deactivate(licenseKey, discordId, cb) {

    // call the nebula api endpoint
    let result = await fetch(`${process.env.NEBULA_API_ENDPOINT}/auth`,
        {
            method: "DELETE",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                discordId,
                key: licenseKey
            }),
        });

    if (result.status === 200) {
        return cb(`${licenseKey} successfully deactivated`);
    } else if (result.status === process.env.KEY_IN_USE) {
        return cb(`Invalid key, or unable to deactivate.`);
    } // otherwise send no status report to reduce clutter
}

// async function purge(licenseKey, discordId, cb) {

//     // call the nebula api endpoint
//     let result = await fetch(`${process.env.NEBULA_API_ENDPOINT}/user`,
//         {
//             method: "POST",
//             headers: {
//                 'Accept': 'application/json',
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({
//                 discordId,
//                 licenseKey
//             }),
//         });

//     if (result.status === process.env.SUCCESS) {
//         return cb(`${licenseKey} successfully bound`);
//     } else if (result.status === process.env.KEY_IN_USE) {
//         return cb(`Key: ${licenseKey} in use.`);
//     } // otherwise send no status report to reduce clutter
// }

// purge
module.exports = { bind, deactivate,  };