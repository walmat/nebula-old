import regexes from './regexes';

export default product => {
  const kws = product.raw.split(',').reduce((a, x) => a.concat(x.trim().split(' ')), []);

  const validKeywords = kws.every(kw => regexes.keywordRegex.test(kw));

  if (regexes.urlRegex.test(product.raw)) {
    return {
      ...product,
      url: product.raw,
    };
  }

  if (regexes.variantRegex.test(product.raw)) {
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

    const modifiedProduct = product;
    delete modifiedProduct.url;

    return {
      ...modifiedProduct,
      raw: product.raw,
      pos: posKeywords,
      neg: negKeywords,
    };
  }
  return null;
};
