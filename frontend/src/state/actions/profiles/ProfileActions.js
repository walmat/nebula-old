import makeActionCreator from '../ActionCreator';

// Top level Actions
export const ADD_PROFILE = 'ADD_PROFILE';
export const REMOVE_PROFILE = 'REMOVE_PROFILE';
export const EDIT_PROFILE = 'EDIT_PROFILE';

export const addProfile = makeActionCreator(ADD_PROFILE, 'profile');
export const removeProfile = makeActionCreator(REMOVE_PROFILE, 'id');
export const editProfile = makeActionCreator(EDIT_PROFILE, 'id', 'field', 'value', 'subField');

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
}
