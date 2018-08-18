const countries = [
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
];

export default function getAllCountries() {
  return countries;
  // return JSON.parse(JSON.stringify(countries));
}

export function getCountry(countryCode) {
  return Object.assign({}, countries.find(country => country.code === countryCode));
}
