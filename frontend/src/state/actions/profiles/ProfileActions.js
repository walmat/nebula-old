import makeActionCreator from '../ActionCreator';

// Top level Actions
export const PROFILE_ACTIONS = {
  ADD: 'ADD_PROFILE',
  REMOVE: 'REMOVE_PROFILE',
  EDIT: 'EDIT_PROFILE',
  SELECT: 'SELECT_PROFILE',
};

const addProfile = makeActionCreator(PROFILE_ACTIONS.ADD, 'profile');
const removeProfile = makeActionCreator(PROFILE_ACTIONS.REMOVE, 'id');
const editProfile = makeActionCreator(PROFILE_ACTIONS.EDIT, 'id', 'field', 'value', 'subField');
const selectProfile = makeActionCreator(PROFILE_ACTIONS.SELECT, 'profile');

export const profileActions = {
  add: addProfile,
  remove: removeProfile,
  edit: editProfile,
  select: selectProfile,
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

export const mapProfileFieldToKey = {
  [PROFILE_FIELDS.EDIT_SHIPPING]: 'shipping',
  [PROFILE_FIELDS.EDIT_BILLING]: 'billing',
  [PROFILE_FIELDS.EDIT_PAYMENT]: 'payment',
  [PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING]: 'billingMatchesShipping',
  [PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING]: 'billingMatchesShipping',
  [PROFILE_FIELDS.EDIT_NAME]: 'name',
};
