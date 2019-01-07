import _ from 'underscore';
import countries from './countries.json';

export default function getAllCountries() {
  return countries;
}

export function getProvinces(countryCode) {
  return _.filter(countries, c => c.code === countryCode)[0].provinces;
}

export function getCountry(countryCode) {
  return Object.assign({}, countries.find(country => country.code === countryCode));
}
