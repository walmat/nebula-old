import _ from 'underscore';
import countries from './countries.json';

export default function getAllCountries() {
  return countries;
}

export function getProvinces(countryCode) {
  const country = _.find(countries, c => c.code === countryCode);
  return country && country.provinces;
}

export function getCountry(countryCode) {
  return Object.assign({}, countries.find(country => country.code === countryCode));
}
