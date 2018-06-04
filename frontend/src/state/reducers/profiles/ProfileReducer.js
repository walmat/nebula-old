import { PROFILE_FIELDS } from '../../Actions';
import { locationReducer, initialLocationState } from './LocationReducer';
import { paymentReducer, initialPaymentState } from './PaymentReducer';

export const initialProfileState = {
  id: 0,
  profileName: '',
  errors: {
    profileName: null,
  },
  billingMatchesShipping: false,
  shipping: initialLocationState,
  billing: initialLocationState,
  payment: initialPaymentState,
};

export function profileReducer(state = initialProfileState, action) {
  let change = {};
  switch (action.field) {
    case PROFILE_FIELDS.EDIT_SHIPPING:
      change = {
        shipping: locationReducer(state.shipping, { type: action.subField, value: action.value }),
      };
      break;
    case PROFILE_FIELDS.EDIT_BILLING:
      change = {
        billing: locationReducer(state.billing, { type: action.subField, value: action.value }),
      };
      break;
    case PROFILE_FIELDS.EDIT_PAYMENT:
      change = {
        payment: paymentReducer(state.payment, { type: action.subField, value: action.value, errors: action.errors }),
      };
      break;
    case PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING:
      change = {
        billingMatchesShipping: !state.billingMatchesShipping,
      };
      break;
    case PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING:
      change = {
        billingMatchesShipping: action.value,
      };
      break;
    case PROFILE_FIELDS.EDIT_NAME:
      change = {
        profileName: action.value,
      };
      break;
    default:
      change = {};
  }
  return Object.assign({}, state, change);
}
