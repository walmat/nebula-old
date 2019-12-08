import { Utils } from '../../common';

const { getRandomIntInclusive } = Utils;

// eslint-disable-next-line import/prefer-default-export
export const pickVariant = async (variants, size) => {
  const inStockVariants = variants.filter(u => u.stockLevelStatus === 'inStock');

  let picked;
  if (size !== 'Random') {
    picked = inStockVariants.find(v => v.attributes[0].value === size);
  } else {
    const rand = getRandomIntInclusive(0, inStockVariants.length - 1);

    picked = inStockVariants[rand];
  }

  return picked;
};
