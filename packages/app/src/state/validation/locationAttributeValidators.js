// import regexes from '../validation';
import { LOCATION_FIELDS } from '../actions';
import getAllCountries, { getProvinces } from '../../constants/getAllCountries';

function validateAddress(address, isFormValidator) {
  if (!isFormValidator && address === '') {
    return true;
  }

  return address && address !== '';
}

function validateApt(input, isFormValidator) {
  if (!isFormValidator && input === '') {
    return true;
  }

  if (input && isFormValidator) {
    return input !== '';
  }
  return true;
}

function validateCity(city, isFormValidator) {
  if (!isFormValidator && city === '') {
    return true;
  }
  // TOOD: create regex for cities (or use google location api)
  return city && city !== '';
}

function validateCountry(country) {
  const countries = getAllCountries();
  return country && countries.some(c => c.code === country.value);
}

function validateFirstName(firstName, isFormValidator) {
  // Make sure first name is not empty
  if (!isFormValidator && firstName === '') {
    return true;
  }
  return firstName && firstName !== '';
}

function validateLastName(lastName, isFormValidator) {
  if (!isFormValidator && lastName === '') {
    return true;
  }
  // Make sure last name is not empty
  return lastName && lastName !== '';
}

function validatePhoneNumber(phoneNumber, isFormValidator) {
  if (!isFormValidator && phoneNumber === '') {
    return true;
  }
  // trust that the phone number they gave us is right
  return phoneNumber && phoneNumber !== '';
}

function validateProvince({ country = {}, province = {} }) {
  const provinces = getProvinces(country.value);
  if (provinces && provinces.length === 0) {
    return true; // there are no states for this country, so it is "valid"
  }
  return provinces && provinces.some(s => s.code === province.value);
}

function validateZipCode(zipCode, isFormValidator) {
  if (!isFormValidator && zipCode === '') {
    return true;
  }
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
