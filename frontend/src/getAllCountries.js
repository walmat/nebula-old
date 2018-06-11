const countries = [
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
];

export default function getAllCountries() {
  return JSON.parse(JSON.stringify(countries));
}

export function getCountry(countryCode) {
  return Object.assign({}, countries.find(country => country.code === countryCode));
}
