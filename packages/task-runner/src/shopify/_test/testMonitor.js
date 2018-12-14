const Monitor = require('../classes/monitor');
const { States } = require('../taskRunner');

const tasks = [
  {
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
  },
  {
    id: 2,
    site: {
      url: 'https://blendsus.com',
      name: 'blendsus',
    },
    product: {
      raw: '9577878421551',
      variant: '9577878421551',
    },
    sizes: ['9', '7.5', '10', '8'],
    errorDelay: 2000,
    monitorDelay: 2000,
  },
  {
    id: 3,
    site: {
      url: 'https://blendsus.com',
      name: 'blendsus',
    },
    product: {
      raw: 'https://www.blendsus.com/products/clarks-x-beams-wallabee-gtx-boot-navy',
      url: 'https://www.blendsus.com/products/clarks-x-beams-wallabee-gtx-boot-navy',
    },
    sizes: ['9', '7.5', '10', '8'],
    errorDelay: 2000,
    monitorDelay: 2000,
  },
];

const context = {
  task: tasks[0],
  proxy: undefined, // Eventually test with proxy...
  aborted: false,
  runner_id: 1,
};

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
};

const monitor = new Monitor(context);

async function testMonitorAbort() {
  // check to make sure aborted works properly...
  context.aborted = true;
  let state = await monitor.run();
  if(state !== States.Aborted) {
    throw new Error('Aborting doesn\'t work!');
  }
  context.aborted = false;
  console.log('Abort works fine');
}

async function testMonitorKeyword() {
  let state;
  context.task = tasks[0];

  // Keep running until we get a checkout
  while(state !== States.Checkout) {
    state = await monitor.run();
    console.log(`Run loop finished with state: ${state}`);
  }

  console.log(`Variants to Checkout:\n${JSON.stringify(context.task.product.variants, null, 2)}`);

}

async function testMonitorVariant() {
  let state;
  context.task = tasks[1];

  // Keep running until we get a checkout
  while(state !== States.Checkout) {
    state = await monitor.run();
    console.log(`Run loop finished with state: ${state}`);
  }

  console.log(`Variants to Checkout:\n${JSON.stringify(context.task.product.variants, null, 2)}`);
}

async function testMonitorUrl() {
  let state;
  context.task = tasks[2];

  // Keep running until we get a checkout
  while(state !== States.Checkout) {
    state = await monitor.run();
    console.log(`Run loop finished with state: ${state}`);
  }

  console.log(`Variants to Checkout:\n${JSON.stringify(context.task.product.variants, null, 2)}`);
}

async function testMonitor() {
  // ABORT
  console.log('===============================================');
  console.log('Testing Monitor Abort');
  await testMonitorAbort();

  await delay(1000);

  // KEYWORD
  console.log('===============================================');
  console.log('Testing Monitor Keyword');
  await testMonitorKeyword();

  await delay(1000);

  // VARIANT
  console.log('===============================================');
  console.log('Testing Monitor Variant');
  await testMonitorVariant();

  await delay(1000);

  // URL
  console.log('===============================================');
  console.log('Testing Monitor Url');
  await testMonitorUrl();

  await delay(1000);

  // Summary
  console.log('===============================================');
  console.log('Monitor Summary');
  ['Keyword', 'Variant', 'Url'].forEach((s, idx) => {
    console.log(`${s} Monitor Variants Returns:`);
    console.log(JSON.stringify(tasks[idx].product.variants, null, 2));
  });
}

testMonitor();
