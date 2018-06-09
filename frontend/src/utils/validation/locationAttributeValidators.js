import regexes from '../validation';
import { LOCATION_FIELDS } from '../../state/Actions';
import getAllCountries from '../../getAllCountries';
import getAllStates from '../../getAllStates';

function validateAddress(address) {
    // TODO: Create regex for addresses (or use google location api)
    return address && address !== '';
}

function validateApt(apt) {
    // no validation needed
    return true;
}

function validateCity(city) {
    // TOOD: create regex for cities (or use google location api)
    return city && city !== '';
}

function validateCountry(country) {
    const countries = getAllCountries();
    return country && countries.some(c => c.name === country);
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

function validateState(state) {
    const states = getAllStates();
    return state && states.some(s => s.name === state);
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
    [LOCATION_FIELDS.STATE]: validateState,
    [LOCATION_FIELDS.ZIP_CODE]: validateZipCode,
};

export default locationAttributeValidators;
