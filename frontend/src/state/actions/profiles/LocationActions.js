import { makeActionCreator } from '../ActionCreator';

export const EDIT_LOCATION = 'EDIT_LOCATION';

export const LOCATION_FIELDS = {
  FIRST_NAME: 'FIRST_NAME',
  LAST_NAME: 'LAST_NAME',
  ADDRESS: 'ADDRESS',
  APT: 'APT',
  CITY: 'CITY',
  ZIP_CODE: 'ZIP_CODE',
  PHONE_NUMBER: 'PHONE_NUMBER',
  COUNTRY: 'COUNTRY',
  STATE: 'STATE'
};

export const editLocation = makeActionCreator(EDIT_LOCATION, 'field', 'value');
