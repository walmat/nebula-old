import { makeActionCreator } from '../ActionCreator';

// Top level Actions
export const ADD_PROFILE = 'ADD_PROFILE';
export const REMOVE_PROFILE = 'REMOVE_PROFILE';
export const EDIT_PROFILE = 'EDIT_PROFILE';

export const addProfile    = makeActionCreator(ADD_PROFILE, 'profile');
export const removeProfile = makeActionCreator(REMOVE_PROFILE, 'id');
export const editProfile   = makeActionCreator(EDIT_PROFILE, 'id', 'field', 'value', 'subfield');

// Field Edits
export const EDIT_SHIPPING = 'EDIT_SHIPPING';
export const EDIT_BILLING = 'EDIT_BILLING';
export const EDIT_PAYMENT = 'EDIT_PAYMENT';
export const EDIT_BILLING_MATCHES_SHIPPING = 'EDIT_BILLING_MATCHES_SHIPPING';
export const TOGGLE_BILLING_MATCHES_SHIPPING = 'TOGGLE_BILLING_MATCHES_SHIPPING';
export const EDIT_NAME = 'EDIT_NAME';
export const ADD_VALIDATION_ERROR = 'ADD_VALIDATION_ERROR';
export const REMOVE_VALIDATION_ERROR = 'REMOVE_VALIDATION_ERROR';
