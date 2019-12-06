import { getCountry } from './getAllCountries';

// eslint-disable-next-line import/prefer-default-export
export const isProvinceDisabled = (country, disabled) => {
  if (country && country.value) {
    const { provinces } = getCountry(country.value);
    if (!provinces || !provinces.length) {
      return true;
    }
  }
  return disabled;
};
