/* global describe it expect beforeEach */
import getAllCountries, { getCountry, getProvinces } from '../../constants/getAllCountries';
import countries from '../../constants/countries.json';

describe('getAllCountries', () => {
  it('should return all provinces correctly', () => {
    expect(getAllCountries()).toEqual(countries);
  });

  it('should lookup the correct countries', () => {
    countries.forEach(country => {
      expect(getCountry(country.code)).toEqual(country);
    });
  });

  it('should receive provinces for each country', () => {
    countries.forEach(country => {
      const expected = getCountry(country.code).provinces;
      const provinces = getProvinces(country.code);
      expect(provinces).toEqual(expected);
    });
  });
});
