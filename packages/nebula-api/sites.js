const { storeSite, deleteSite } = require('./dynamoDBSites');
const sites = require('./sites.json');

async function run(flag) {
  sites.forEach(async site => {
    try {
      if (flag === 'store') {
        await storeSite(site);
      } else if (flag === 'delete') {
        await deleteSite(site);
      }
    } catch (err) {
      console.log(`Failed ${flag} site: ${site}, error: ${err}`);
    }
  });
}

if (process.argv.length === 3) {
  switch (process.argv[2]) {
    case '-s':
      run('store');
      break;
    case '-d':
      run('delete');
      break;
    default:
      console.log(`No flag provided: \n\n'-s': store sites\n'-d': delete sites`);
  }
}
