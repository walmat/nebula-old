const { getRandomIntInclusive } = require('./index');
const { urlToTitleSegment, urlToVariantOption } = require('./urlVariantMaps');

async function pickVariant(variants, sizes, url, logger = { log: () => {} }) {
  const [size] = sizes; // temporary: only support one size
  if (/random/i.test(size)) {
    const rand = getRandomIntInclusive(0, variants.length - 1);
    return variants[rand].id;
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

  return variant.id;
}

module.exports = pickVariant;
