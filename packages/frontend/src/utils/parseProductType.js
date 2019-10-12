import regexes from './validation';

export default product => {
  const kws = product.raw.split(',').reduce((a, x) => a.concat(x.trim().split(' ')), []);

  const validKeywords = kws.every(kw => regexes.keywordRegex.test(kw));

  if (regexes.urlRegex.test(product.raw)) {
    // test a url match
    return {
      ...product,
      url: product.raw,
    };
  }

  if (regexes.variantRegex.test(product.raw)) {
    // test variant match
    return {
      ...product,
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
      ...product,
      pos_keywords: posKeywords,
      neg_keywords: negKeywords,
    };
  }
  return null;
};
