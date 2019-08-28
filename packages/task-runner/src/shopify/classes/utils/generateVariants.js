const { groupBy, filter, flatten, pick } = require('underscore');

const { getRandomIntInclusive } = require('./index');
const { urlToTitleSegment, urlToVariantOption } = require('./urlVariantMaps');
const { ErrorCodes } = require('./constants');

async function generateVariants(product, sizes, site, logger = { log: () => {} }, random) {
  if (random) {
    return { variant: product.variants[0].id };
  }

  // Group variants by their size
  const variantsBySize = groupBy(product.variants, variant => {
    // Use the variant option or the title segment
    const defaultOption = urlToVariantOption[site.url] ? urlToVariantOption[site.url] : 'option1';
    const option = variant[defaultOption] || urlToTitleSegment[site.url](variant.title);

    // TEMPORARY: Sometimes the option1 value contains /'s to separate regional sizes.
    // Until this case gets fully solved in issue #239
    if (option.indexOf('/') > 0) {
      const newOption = urlToTitleSegment[site.url](variant.title);
      return newOption;
    }
    return option.toUpperCase();
  });
  logger.log('debug', 'VARIANTS BY SIZE: %j', variantsBySize);

  // Get the groups in the same order as the sizes
  const mappedVariants = sizes.map(size => {
    if (size === 'Random') {
      const val = getRandomIntInclusive(0, Object.keys(variantsBySize).length - 1);
      const variants = variantsBySize[Object.keys(variantsBySize)[val]];
      return variants;
    }
    // Determine if we are checking for shoe sizes or not
    let sizeMatcher;
    if (/[0-9]+/.test(size)) {
      // We are matching a shoe size
      sizeMatcher = s => new RegExp(`${size}`, 'i').test(s);
    } else {
      // We are matching a garment size
      sizeMatcher = s => !/[0-9]+/.test(s) && new RegExp(`^${size}`, 'i').test(s.trim());
    }
    const variant = Object.keys(variantsBySize).find(sizeMatcher);
    return variantsBySize[variant];
  });

  logger.log('debug', 'MAPPED VARIANTS: %j', mappedVariants);

  // Flatten the groups to a one-level array and remove null elements
  const validVariants = filter(flatten(mappedVariants, true), v => v);
  // only pick certain properties of the variants to print
  logger.log(
    'debug',
    'Generated valid variants: %j',
    validVariants.map(v =>
      pick(v, 'id', 'product_id', 'barcode', 'title', 'price', 'option1', 'option2', 'option3'),
    ),
  );
  if (validVariants.length > 0) {
    let base = {
      variants: validVariants.map(v => `${v.id}`),
      sizes: validVariants.map(v => `${v.title || v.option1}`),
    };

    if (/yeezysupply/i.test(site.url)) {
      base = {
        ...base,
        barcode: validVariants.map(v => `${v.barcode}`),
      };
    }
    return base;
  }
  const err = new Error('No variants matched');
  err.code = ErrorCodes.VariantsNotMatched;
  throw err;
}

module.exports = generateVariants;
