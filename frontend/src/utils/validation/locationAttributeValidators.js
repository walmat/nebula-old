import regexes from '../validation';
import { LOCATION_FIELDS } from '../../state/Actions';
import getAllCountries from '../../getAllCountries';
import getAllStates from '../../getAllStates';

function validateAddress(address) {
    // TODO: Create regex for addresses (or use google location api)
    return true;
}

function validateApt(apt) {
    // no validation needed
    return true;
}

function validateCity(city) {
    // TOOD: create regex for cities (or use google location api)
    return true;
}

function validateCountry(country) {
    const countries = getAllCountries();
    return country && countries.filter(c => c.name === country).length > 0;
}

function validateFirstName(firstName) {
    // no validation needed
    return true;
}

function validateLastName(lastName) {
    // no validation needed
    return true;
}

function validatePhoneNumber(phoneNumber) {
    return phoneNumber && regexes.phoneNumber.test(phoneNumber);
}

function validateState(state) {
    const states = getAllStates();
    return state && states.filter(s => s.name === state).length > 0;
}

function validateZipCode(zipCode) {
    // TODO: create regex for zip codes (or use google location api)
    return true;
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
