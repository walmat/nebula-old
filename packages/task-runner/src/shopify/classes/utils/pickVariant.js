/* eslint-disable consistent-return */
/* eslint-disable array-callback-return */
const { getRandomIntInclusive } = require('./index');
const { urlToTitleSegment, urlToVariantOption } = require('./urlVariantMaps');

async function pickVariant(variants, size, url, logger = { log: () => {} }) {
  if (/random/i.test(size)) {
    const rand = getRandomIntInclusive(0, variants.length - 1);
    const variant = variants[rand];
    const option = variant.option1 || variant.option2 || variant.option3;
    return { id: variant.id, option };
  }

  logger.log('debug', 'Incoming variants: %j', variants);

  const variant = variants.find(v => {
    const defaultOption = urlToVariantOption[url] ? urlToVariantOption[url] : 'option1';
    let option = v[defaultOption] || urlToTitleSegment[url](v.title);

    if (option.indexOf('/') > 0) {
      option = urlToTitleSegment[url](v.title);
    }

    logger.log('debug', 'Matching based off of: %j', option);
    // Determine if we are checking for shoe sizes or not
    let sizeMatcher;
    if (/[0-9]+/.test(size)) {
      // We are matching a shoe size
      sizeMatcher = s => new RegExp(`${size}`, 'i').test(s);
    } else {
      // We are matching a garment size
      sizeMatcher = s => !/[0-9]+/.test(s) && new RegExp(`^${size}`, 'i').test(s.trim());
    }

    if (sizeMatcher(option)) {
      logger.log('debug', 'Choosing variant: %j', v);
      return v;
    }
  });

  if (!variant) {
    return null;
  }

  const option = variant.option1 || variant.option2 || variant.option3;

  return { id: variant.id, option };
}

module.exports = pickVariant;
