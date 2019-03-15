const _ = require('underscore');

const { getRandomIntInclusive } = require('./index');
const { urlToTitleSegment, urlToVariantOption } = require('./urlVariantMaps');
const {
  ErrorCodes: { Variant: ErrorCodes },
} = require('./constants');

function generateVariants(product, sizes, site, logger = { log: () => {} }) {
  // Filter out unavailable variants first
  const availableVariants = product.variants.filter(v => v.available);
  if (!availableVariants.length) {
    const err = new Error('No variants available');
    err.code = ErrorCodes.VariantsNotAvailable;
    throw err;
  }

  // Group variants by their size
  const variantsBySize = _.groupBy(availableVariants, variant => {
    // Use the variant option or the title segment
    const option =
      variant[urlToVariantOption[site.url]] || urlToTitleSegment[site.url](variant.title);
    // TEMPORARY: Sometimes the option1 value contains /'s to separate regional sizes.
    //   Until this case gets fully solved in issue #239
    if (option.indexOf('/') > 0) {
      const newOption = urlToTitleSegment[site.url](variant.title);
      return newOption;
    }
    return option.toUpperCase();
  });

  // Get the groups in the same order as the sizes
  const mappedVariants = sizes.map(size => {
    if (size === 'Random') {
      const val = getRandomIntInclusive(0, Object.keys(variantsBySize).length - 1);
      const variants = variantsBySize[Object.keys(variantsBySize)[val]];
      return variants;
    }
    const variant = Object.keys(variantsBySize).find(
      s => s.toUpperCase().indexOf(size.toUpperCase()) > -1,
    );
    return variantsBySize[variant];
  });

  // Flatten the groups to a one-level array and remove null elements
  const validVariants = _.filter(_.flatten(mappedVariants, true), v => v);
  // only pick certain properties of the variants to print
  logger.log(
    'verbose',
    'Generated valid variants: %j',
    validVariants.map(v =>
      _.pick(v, 'id', 'product_id', 'title', 'price', 'option1', 'option2', 'option3'),
    ),
  );
  if (validVariants.length > 0) {
    return validVariants.map(v => `${v.id}`);
  }
  const err = new Error('No variants matched');
  err.code = ErrorCodes.VariantsNotMatched;
  throw err;
}

module.exports = generateVariants;
