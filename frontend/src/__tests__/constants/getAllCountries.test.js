/* global describe it expect beforeEach */
import getAllCountries, { getCountry } from '../../constants/getAllCountries';

describe('getAllCountries', () => {
  let expectedCountries;

  beforeEach(() => {
    expectedCountries = [
      { value: 'US', label: 'United States' },
      { value: 'UK', label: 'United Kingdom' },
      { value: 'DE', label: 'Germany' },
    ];
  });

  it('should return all states correctly', () => {
    expect(getAllCountries()).toEqual(expectedCountries);
  });

  it('should lookup the correct countries', () => {
    expectedCountries.forEach((country) => {
      expect(getCountry(country.value)).toEqual(country);
    });
  });
});
