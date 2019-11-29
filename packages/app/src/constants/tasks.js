import { generate } from 'shortid';

export const Types = {
  SAFE: 'SAFE',
  FAST: 'FAST',
};

export const _getIndexAndId = list => {
  let _num = list.length + 1;
  // if the tasksList is empty, reset the numbering
  if (list.length === 0) {
    _num = 1;
  }

  // assign new index
  let newIndex = _num;

  // check if generate id already exists
  const idCheck = t => t.index === newIndex;
  while (list.some(idCheck)) {
    _num += 1;
    newIndex = _num;
  }

  return { index: newIndex, id: generate() };
}
