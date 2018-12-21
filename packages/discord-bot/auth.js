const fetch = require('node-fetch');

async function bind(licenseKey, discordId, cb) {
  // call the nebula api endpoint
  const result = await fetch(
    `${process.env.NEBULA_API_ENDPOINT}/auth/discord`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        discordId,
        licenseKey,
      }),
    }
  );

  const body = await result.json();
  if (result.status === 200) {
    return cb(false, body.message);
  }
  return cb(true, body.message);
}

async function deactivate(licenseKey, discordId, cb) {
  // call the nebula api endpoint
  const result = await fetch(
    `${process.env.NEBULA_API_ENDPOINT}/auth/discord`,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        discordId,
        licenseKey,
      }),
    }
  );

  const body = await result.json();
  return cb(body.message);
}

/**
 * add this functionality if we decide to allow reselling of keys
 */
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
module.exports = { bind, deactivate };
