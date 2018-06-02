import { PROFILE_FIELDS } from '../../Actions';
import { locationReducer, initialLocationState } from './LocationReducer';
import { paymentReducer, initialPaymentState } from './PaymentReducer';

export const initialProfileState = {
  id: 0,
  profileName: '',
  errors: {},
  billingMatchesShipping: false,
  shipping: initialLocationState,
  billing: initialLocationState,
  payment: initialPaymentState
}

export function profileReducer(state = initialProfileState, action) {
  let change = {};
  switch(action.field) {
    case PROFILE_FIELDS.EDIT_SHIPPING:
      change = {
        shipping: locationReducer(state.shipping, {type: action.subfield, value: action.value})
      };
      break;
    case PROFILE_FIELDS.EDIT_BILLING:
      change = {
        billing: locationReducer(state.billing, {type: action.subfield, value: action.value})
      };
      break;
    case PROFILE_FIELDS.EDIT_PAYMENT:
      change = {
        payment: paymentReducer(state.payment, {type: action.subfield, value: action.value})
      };
      break;
    default:
      change = {};
  }
  return Object.assign({}, state, change);
}
