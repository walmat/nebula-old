import { Utils } from '../../common';

const { getRandomIntInclusive } = Utils;

export default context => {
  const {
    task: {
      product: { variants, randomInStock },
      size,
    },
    logger,
  } = context;

  let grouping = variants;

  if (randomInStock) {
    grouping = grouping.filter(v => v.stock_level);

    // if we filtered all the products out, rewind it to all variants...
    if (!grouping || !grouping.length) {
      grouping = variants;
    }
  }

  if (/random/i.test(size)) {
    return grouping[getRandomIntInclusive(0, grouping.length - 1)];
  }

  const variant = grouping.find(v => {
    // Determine if we are checking for shoe sizes or not
    let sizeMatcher;
    if (/[0-9]+/.test(size)) {
      // We are matching a shoe size
      sizeMatcher = s => new RegExp(`${size}`, 'i').test(s);
    } else {
      // We are matching a garment size
      sizeMatcher = s => !/[0-9]+/.test(s) && new RegExp(`^${size}`, 'i').test(s.trim());
    }

    if (sizeMatcher(v.name)) {
      logger.debug('Choosing variant: %j', v);
      return v;
    }
    return null;
  });

  if (randomInStock) {
    if (variant) {
      const { stock_level: stockLevel } = variant;
      if (!stockLevel) {
        const checkedGroup = grouping;

        do {
          const newVariant = checkedGroup.pop();
          if (newVariant.stock_level) {
            return newVariant;
          }
        } while (checkedGroup.length);

        if (!checkedGroup.length) {
          return grouping[getRandomIntInclusive(0, grouping.length - 1)];
        }
      }
    } else {
      return grouping[getRandomIntInclusive(0, grouping.length - 1)];
    }
  }

  if (!variant) {
    return null;
  }

  return variant;
};