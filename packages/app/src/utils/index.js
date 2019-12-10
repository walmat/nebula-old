import renderSvgIcon from './renderSvgIcon';
import regexes from './regexes';

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

export const parseProduct = product => {
  const kws = product.raw.split(',').reduce((a, x) => a.concat(x.trim().split(' ')), []);

  const validKeywords = kws.every(kw => regexes.keywordRegex.test(kw));

  if (regexes.urlRegex.test(product.raw)) {
    return {
      raw: product.raw,
      url: product.raw,
    };
  }

  if (regexes.variantRegex.test(product.raw)) {
    return {
      raw: product.raw,
      variant: product.raw,
    };
  }

  if (validKeywords) {
    // test keyword match
    const posKeywords = [];
    const negKeywords = [];
    kws.forEach(kw => {
      if (kw.startsWith('+')) {
        // positive keywords
        posKeywords.push(kw.slice(1, kw.length));
      } else {
        // negative keywords
        negKeywords.push(kw.slice(1, kw.length));
      }
    });

    return {
      raw: product.raw,
      pos: posKeywords,
      neg: negKeywords,
    };
  }
  return null;
}


export { renderSvgIcon };
