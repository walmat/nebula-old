const Monitor = require('../classes/monitor');
const { States } = require('../taskRunner');

const task = {
  id: 1,
  site: {
    url: 'https://blendsus.com',
    name: 'blendsus',
  },
  product: {
    raw: '+clarks, +gtx, -vans',
    pos_keywords: [
      'clarks',
      'gtx',
    ],
    neg_keywords: [
      'vans'
    ],
  },
  sizes: ['9', '7.5', '10', '8'],
  errorDelay: 2000,
  monitorDelay: 2000,
};

const context = {
  task,
  proxy: undefined, // Eventually test with proxy...
  aborted: false,
  runner_id: 1,
};

const monitor = new Monitor(context);

async function testMonitor() {
  // check to make sure aborted works properly...
  context.aborted = true;
  let state = await monitor.run();
  if(state !== States.Aborted) {
    throw new Error('Aborting doesn\'t work!');
  }
  context.aborted = false;

  // Keep running until we get a checkout
  while(state !== States.Checkout) {
    state = await monitor.run();
    console.log(`Run loop finished with state: ${state}`);
  }
}

testMonitor();