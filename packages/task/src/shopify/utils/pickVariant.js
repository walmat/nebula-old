/* eslint-disable consistent-return */
/* eslint-disable array-callback-return */
import { Utils } from '../../common';

const { getRandomIntInclusive } = Utils;

export default async (variants, size, logger = { log: () => {} }, randomInStock = false) => {
  let variantGroup = [...variants];

  if (randomInStock) {
    variantGroup = variantGroup.filter(v => v.available);

    // if we filtered all the products out, undo...
    if (!variantGroup || !variantGroup.length) {
      variantGroup = [...variants];
    }
  }

  if (/random/i.test(size)) {
    const rand = getRandomIntInclusive(0, variantGroup.length - 1);
    const variant = variantGroup[rand];

    const { option1, option2, option3, title } = variant;
    const options = [option1, option2, option3, title].filter(opt => opt && !/-|\/|\\/g.test(opt));
    return { id: variant.id, option: options[0] };
  }

  let variant = variantGroup.find(v => {
    const { option1, option2, option3, title } = v;

    const options = [option1, option2, option3, title].filter(opt => opt && !/-|\/|\\/g.test(opt));
    // Determine if we are checking for shoe sizes or not
    let sizeMatcher;
    if (/[0-9]+/.test(size)) {
      // We are matching a shoe size
      sizeMatcher = s => new RegExp(`^${size}`, 'i').test(s.replace(/^[^0-9]+/g, ''));
    } else {
      // We are matching a garment size
      sizeMatcher = s => !/[0-9]+/.test(s) && new RegExp(`^${size}`, 'i').test(s.trim());
    }

    if (options.some(option => sizeMatcher(option))) {
      logger.log('debug', 'Choosing variant: %j', v);
      return v;
    }
  });

  if (randomInStock) {
    if (variant) {
      const { available } = variant;
      if (!available) {
        const rand = getRandomIntInclusive(0, variantGroup.length - 1);
        variant = variantGroup[rand];
        const { option1, option2, option3, title } = variant;
        const options = [option1, option2, option3, title].filter(
          opt => opt && !/-|\/|\\/g.test(opt),
        );

        return { id: variant.id, option: options[0] };
      }
    } else {
      const rand = getRandomIntInclusive(0, variantGroup.length - 1);
      variant = variantGroup[rand];

      const { option1, option2, option3, title } = variant;
      const options = [option1, option2, option3, title].filter(
        opt => opt && !/-|\/|\\/g.test(opt),
      );

      return { id: variant.id, option: options[0] };
    }
  }

  if (!variant) {
    return null;
  }

  const { option1, option2, option3, title } = variant;
  const options = [option1, option2, option3, title].filter(opt => opt && !/-|\/|\\/g.test(opt));

  return { id: variant.id, option: options[0] };
};
