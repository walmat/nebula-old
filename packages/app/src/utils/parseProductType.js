import regexes from './regexes';

export default product => {
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
};
