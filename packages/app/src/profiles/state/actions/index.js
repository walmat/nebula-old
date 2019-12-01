import makeActionCreator from '../../../store/creator';

// Top level Actions
export const PROFILE_ACTIONS = {
  CREATE: 'CREATE_PROFILE',
  REMOVE: 'REMOVE_PROFILE',
  DELETE_RATE: 'DELETE_RATE',
  EDIT: 'EDIT_PROFILE',
  ERROR: 'PROFILE_HANDLE_ERROR',
  SELECT: 'SELECT_PROFILE',
  LOAD: 'LOAD_PROFILE',
  UPDATE: 'UPDATE_PROFILE',
  TRANSFER: 'TRANSFER_SHIPPING',
};

const _updateProfileRequest = async (id, profile) => ({ ...profile, id });

// Private Actions
const createProfile = makeActionCreator(PROFILE_ACTIONS.ADD, 'profile');
const removeProfile = makeActionCreator(PROFILE_ACTIONS.REMOVE, 'id');
const _updateProfile = makeActionCreator(PROFILE_ACTIONS.UPDATE, 'id', 'profile');

// Public Actions
const editProfile = makeActionCreator(PROFILE_ACTIONS.EDIT, 'id', 'field', 'value', 'subField');
const transferProfile = makeActionCreator(PROFILE_ACTIONS.TRANSFER);
const selectProfile = makeActionCreator(PROFILE_ACTIONS.SELECT, 'profile');
const loadProfile = makeActionCreator(PROFILE_ACTIONS.LOAD, 'profile');
const handleError = makeActionCreator(PROFILE_ACTIONS.ERROR, 'action', 'error');
const deleteRate = makeActionCreator(PROFILE_ACTIONS.DELETE_RATE, 'site', 'rate');

const updateProfile = (id, profile) => dispatch =>
  _updateProfileRequest(id, profile).then(
    updatedProfile => dispatch(_updateProfile(updatedProfile)),
    error => dispatch(handleError(PROFILE_ACTIONS.UPDATE, error)),
  );

export const profileActions = {
  create: createProfile,
  remove: removeProfile,
  edit: editProfile,
  select: selectProfile,
  load: loadProfile,
  update: updateProfile,
  error: handleError,
  deleteRate,
  transfer: transferProfile,
};

// Field Edits
export const PROFILE_FIELDS = {
  EDIT_SHIPPING: 'EDIT_SHIPPING',
  EDIT_BILLING: 'EDIT_BILLING',
  EDIT_PAYMENT: 'EDIT_PAYMENT',
  EDIT_RATES: 'EDIT_RATES',
  EDIT_SELECTED_SITE: 'EDIT_SELECTED_SITE',
  TOGGLE_MATCHES: 'TOGGLE_BILLING_MATCHES_SHIPPING',
  EDIT_NAME: 'EDIT_NAME',
};

export const LOCATION_FIELDS = {
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName',
  ADDRESS: 'address',
  APT: 'apt',
  CITY: 'city',
  ZIP: 'zip',
  PHONE: 'phone',
  COUNTRY: 'country',
  PROVINCE: 'province',
};

export const PAYMENT_FIELDS = {
  EMAIL: 'email',
  CARD: 'card',
  EXP: 'exp',
  CVV: 'cvv',
};

export const RATES_FIELDS = {
  SITE: 'selectedSite',
  NAME: 'selectedName',
  RATE: 'selectedRate',
};

export const mapProfileFieldToKey = {
  [PROFILE_FIELDS.EDIT_SHIPPING]: 'shipping',
  [PROFILE_FIELDS.EDIT_BILLING]: 'billing',
  [PROFILE_FIELDS.EDIT_PAYMENT]: 'payment',
  [PROFILE_FIELDS.EDIT_RATES]: 'rates',
  [PROFILE_FIELDS.EDIT_SELECTED_SITE]: 'selectedSite',
  [PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING]: 'billingMatchesShipping',
  [PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING]: 'billingMatchesShipping',
  [PROFILE_FIELDS.EDIT_NAME]: 'profileName',
};

export const mapLocationFieldToKey = {
  [LOCATION_FIELDS.FIRST_NAME]: 'firstName',
  [LOCATION_FIELDS.LAST_NAME]: 'lastName',
  [LOCATION_FIELDS.ADDRESS]: 'address',
  [LOCATION_FIELDS.APT]: 'apt',
  [LOCATION_FIELDS.CITY]: 'city',
  [LOCATION_FIELDS.ZIP]: 'zip',
  [LOCATION_FIELDS.PHONE]: 'phone',
  [LOCATION_FIELDS.COUNTRY]: 'country',
  [LOCATION_FIELDS.PROVINCE]: 'province',
};

export const mapPaymentFieldToKey = {
  [PAYMENT_FIELDS.EMAIL]: 'email',
  [PAYMENT_FIELDS.CARD]: 'card',
  [PAYMENT_FIELDS.EXP]: 'exp',
  [PAYMENT_FIELDS.CVV]: 'cvv',
};

export const mapRateFieldToKey = {
  [RATES_FIELDS.SITE]: 'selectedSite',
  [RATES_FIELDS.NAME]: 'selectedName',
  [RATES_FIELDS.RATE]: 'selectedRate',
};
