import renderSvgIcon from './renderSvgIcon';

export const rangeArr = (from, to) => {
  const result = [];
  if (to < from) {
    // eslint-disable-next-line no-param-reassign
    [from, to] = [to, from];
  }
  for (let i = from; i <= to; i += 1) {
    result.push(i);
  }
  return result;
};

export const min = arr => arr.reduce((result, i) => (i < result ? i : result), arr[0]);

export const max = arr => arr.reduce((result, i) => (i > result ? i : result), arr[0]);

export { renderSvgIcon };
