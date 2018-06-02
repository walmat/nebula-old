import { LOCATION_FIELDS } from '../../Actions'

export const initialLocationState = {
  firstName: '',
  lastName: '',
  address: '',
  apt: '',
  city: '',
  country: 'United States',
  state: '',
  zipCode: '',
  phone: ''
}

export const locationReducer = (state = initialLocationState, action) => {
  let change = {};
  switch (action.type) {
    case LOCATION_FIELDS.FIRST_NAME:
      change = {firstName: action.value}; break;
    case LOCATION_FIELDS.LAST_NAME:
      change = {lastName: action.value}; break;
    case LOCATION_FIELDS.ADDRESS:
      change = {address: action.value}; break;
    case LOCATION_FIELDS.APT:
      change = {apt: action.value}; break;
    case LOCATION_FIELDS.CITY:
      change = {city: action.value}; break;
    case LOCATION_FIELDS.COUNTRY:
      change = {country: action.value}; break;
    case LOCATION_FIELDS.STATE:
      change = {state: action.value}; break;
    case LOCATION_FIELDS.ZIP_CODE:
      change = {zipCode: action.value}; break;
    case LOCATION_FIELDS.PHONE_NUMBER:
      change = {phone: action.value}; break;
    default:
      change = {};
  }
  return Object.assign({}, state, change);
}
