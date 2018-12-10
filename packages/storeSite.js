const { storeSite, deleteSite } = require('./dynamoDBSites');
const sites = require('./sites.json');

async function run () {
    sites.forEach(async (site) => {
        try {
            await storeSite(site);
        } catch (err) {
            console.log(`Failed storing site: ${site}, error: ${err}`);
        }
    })
} 

run();