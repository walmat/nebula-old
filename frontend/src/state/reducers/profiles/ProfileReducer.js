import { EDIT_LOCATION, LOCATION_FIELDS } from '../../actions/Actions';

function locationReducer(state = {}, action) {
  switch (action.type) {
    case EDIT_LOCATION:
      let change = {};
      switch (action.field) {
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
      }
      return Object.assign({}, location, change);
    default:
      return state;
  }
}
