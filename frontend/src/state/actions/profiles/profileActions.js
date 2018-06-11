import makeActionCreator from '../actionCreator';

// Top level Actions
export const PROFILE_ACTIONS = {
  ADD: 'ADD_PROFILE',
  REMOVE: 'REMOVE_PROFILE',
  EDIT: 'EDIT_PROFILE',
  SELECT: 'SELECT_PROFILE',
  LOAD: 'LOAD_PROFILE',
  UPDATE: 'UPDATE_PROFILE',
};

const addProfile = makeActionCreator(PROFILE_ACTIONS.ADD, 'profile');
const removeProfile = makeActionCreator(PROFILE_ACTIONS.REMOVE, 'id');
const editProfile = makeActionCreator(PROFILE_ACTIONS.EDIT, 'id', 'field', 'value', 'subField');
const selectProfile = makeActionCreator(PROFILE_ACTIONS.SELECT, 'profile');
const loadProfile = makeActionCreator(PROFILE_ACTIONS.LOAD, 'profile');
const updateProfile = makeActionCreator(PROFILE_ACTIONS.UPDATE, 'id', 'profile');

export const profileActions = {
  add: addProfile,
  remove: removeProfile,
  edit: editProfile,
  select: selectProfile,
  load: loadProfile,
  update: updateProfile,
};

// Field Edits
export const PROFILE_FIELDS = {
  EDIT_SHIPPING: 'EDIT_SHIPPING',
  EDIT_BILLING: 'EDIT_BILLING',
  EDIT_PAYMENT: 'EDIT_PAYMENT',
  EDIT_BILLING_MATCHES_SHIPPING: 'EDIT_BILLING_MATCHES_SHIPPING',
  TOGGLE_BILLING_MATCHES_SHIPPING: 'TOGGLE_BILLING_MATCHES_SHIPPING',
  EDIT_NAME: 'EDIT_NAME',
};

export const LOCATION_FIELDS = {
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName',
  ADDRESS: 'address',
  APT: 'apt',
  CITY: 'city',
  ZIP_CODE: 'zipCode',
  PHONE_NUMBER: 'phone',
  COUNTRY: 'country',
  STATE: 'state',
};

export const PAYMENT_FIELDS = {
  EMAIL: 'email',
  CARD_NUMBER: 'cardNumber',
  EXP: 'exp',
  CVV: 'cvv',
};

export const mapProfileFieldToKey = {
  [PROFILE_FIELDS.EDIT_SHIPPING]: 'shipping',
  [PROFILE_FIELDS.EDIT_BILLING]: 'billing',
  [PROFILE_FIELDS.EDIT_PAYMENT]: 'payment',
  [PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING]: 'billingMatchesShipping',
  [PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING]: 'billingMatchesShipping',
  [PROFILE_FIELDS.EDIT_NAME]: 'profileName',
};
