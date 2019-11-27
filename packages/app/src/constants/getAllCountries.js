import countries from './countries.json';

export default function getAllCountries() {
  return countries;
}

export function getProvinces(countryCode) {
  const country = getCountry(countryCode);
  return country && country.provinces;
}

export function getCountry(countryCode) {
  return Object.assign({}, countries.find(country => country.code === countryCode));
}
