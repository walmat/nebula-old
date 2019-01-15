import regexes from '../validation';
import { LOCATION_FIELDS } from '../../state/actions';
import getAllCountries, { getProvinces } from '../../constants/getAllCountries';

function validateAddress(address) {
  // TODO: Create regex for addresses (or use google location api)
  return address && address !== '';
}

function validateApt() {
  // no validation needed
  return true;
}

function validateCity(city) {
  // TOOD: create regex for cities (or use google location api)
  return city && city !== '';
}

function validateCountry(country) {
  const countries = getAllCountries();
  return country && countries.some(c => c.code === country.value);
}

function validateFirstName(firstName) {
  // Make sure first name is not empty
  return firstName && firstName !== '';
}

function validateLastName(lastName) {
  // Make sure last name is not empty
  return lastName && lastName !== '';
}

function validatePhoneNumber(phoneNumber) {
  return phoneNumber && regexes.phoneNumber.test(phoneNumber);
}

function validateProvince({ country, province }) {
  if (!country) {
    return false; // if no country selected, we shouldn't have state options yet– let's exit early
  }
  const provinces = getProvinces(country.value);
  if (provinces.length === 0) {
    return true; // there are no states for this country, so it is "valid"
  }
  return province && provinces.some(s => s.code === province.value);
}

function validateZipCode(zipCode) {
  // TODO: create regex for zip codes (or use google location api)
  return zipCode && zipCode !== '';
}

const locationAttributeValidators = {
  [LOCATION_FIELDS.ADDRESS]: validateAddress,
  [LOCATION_FIELDS.APT]: validateApt,
  [LOCATION_FIELDS.CITY]: validateCity,
  [LOCATION_FIELDS.COUNTRY]: validateCountry,
  [LOCATION_FIELDS.FIRST_NAME]: validateFirstName,
  [LOCATION_FIELDS.LAST_NAME]: validateLastName,
  [LOCATION_FIELDS.PHONE_NUMBER]: validatePhoneNumber,
  [LOCATION_FIELDS.PROVINCE]: validateProvince,
  [LOCATION_FIELDS.ZIP_CODE]: validateZipCode,
};

export default locationAttributeValidators;
