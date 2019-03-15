const _ = require('underscore');

const { getRandomIntInclusive } = require('./index');
const { urlToTitleSegment, urlToVariantOption } = require('./urlVariantMaps');

function generateVariants(product, sizes, site, logger = { log: () => {} }) {
  // Group variants by their size
  const variantsBySize = _.groupBy(product.variants, variant => {
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
      const variant = variantsBySize[Object.keys(variantsBySize)[val]];
      return variant;
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
  return null;
}

module.exports = generateVariants;
