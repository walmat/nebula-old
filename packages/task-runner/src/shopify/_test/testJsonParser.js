/* eslint-disable no-console */
const JsonParser = require('../classes/parsers/jsonParser');

const task1 = {
  id: 1,
  site: {
    url: 'https://www.blendsus.com',
    name: 'blendsus',
  },
  product: {
    raw: '+adidas, +X, -micropacer',
    pos_keywords: ['adidas', 'X'],
    neg_keywords: ['micropacer'],
  },
};
const task2 = {
  ...task1,
  id: 2,
  product: {
    raw: '9543747633199',
    variant: '9543747633199',
  },
};

async function _runMatching(taskToRun) {
  const parser = new JsonParser(task2, null);
  try {
    const product = await parser.run();
    return product.title;
  } catch (err) {
    console.log(`parser for task: ${taskToRun.id}`);
    console.log('parser failed with error:');
    console.log(err);
    return 'ERROR';
  }
}

async function runMatching() {
  const keyword = await _runMatching(task1);
  const variant = await _runMatching(task2);

  console.log('Finished both parsers!');
  console.log(`Keyword Parser: ${keyword}`);
  console.log(`Variant Parser: ${variant}`);
}

runMatching();
