import makeActionCreator from '../../../store/creator';
import prefixer from '../../../store/reducers/prefixer';

const prefix = '@@Profile';
const actionsList = [
  'CREATE_PROFILE',
  'REMOVE_PROFILE',
  'EDIT_PROFILE',
  'SELECT_PROFILE',
  'LOAD_PROFILE',
  'UPDATE_PROFILE',
  'DELETE_RATE',
  'TRANSFER_SHIPPING',
];

export const PROFILE_ACTIONS = prefixer(prefix, actionsList);

const _updateProfileRequest = async (id, profile) => ({ ...profile, id });

// Private Actions
const createProfile = makeActionCreator(PROFILE_ACTIONS.CREATE_PROFILE, 'profile');
const removeProfile = makeActionCreator(PROFILE_ACTIONS.REMOVE_PROFILE, 'id');
const _updateProfile = makeActionCreator(PROFILE_ACTIONS.UPDATE_PROFILE, 'id', 'profile');

// Public Actions
const editProfile = makeActionCreator(
  PROFILE_ACTIONS.EDIT_PROFILE,
  'id',
  'field',
  'value',
  'subField',
);
const transferProfile = makeActionCreator(PROFILE_ACTIONS.TRANSFER_SHIPPING);
const selectProfile = makeActionCreator(PROFILE_ACTIONS.SELECT_PROFILE, 'profile');
const loadProfile = makeActionCreator(PROFILE_ACTIONS.LOAD_PROFILE, 'profile');
const deleteRate = makeActionCreator(PROFILE_ACTIONS.DELETE_RATE, 'site', 'rate');

const updateProfile = (id, profile) => dispatch =>
  _updateProfileRequest(id, profile).then(
    updatedProfile => dispatch(_updateProfile(updatedProfile)),
    error => {},
  );

export const profileActions = {
  create: createProfile,
  remove: removeProfile,
  edit: editProfile,
  select: selectProfile,
  load: loadProfile,
  update: updateProfile,
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
