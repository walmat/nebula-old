import { EDIT_SHIPPING, EDIT_BILLING } from '../../actions/Actions';
import { locationReducer, initialLocationState } from './LocationReducer';

export const initialProfileState = {
  id: 0,
  profileName: '',
  errors: {},
  billingMatchesShipping: false,
  shipping: initialLocationState,
  billing: initialLocationState,
  payment: {}
}

export function profileReducer(state = initialProfileState, action) {
  let change = {};
  switch(action.field) {
    case EDIT_SHIPPING:
      change = {
        shipping: locationReducer(state.shipping, {type: action.subfield, value: action.value})
      };
      break;
    case EDIT_BILLING:
      change = {
        billing: locationReducer(state.billing, {type: action.subfield, value: action.value})
      };
      break;
    default:
      change = {};
  }
  return Object.assign({}, state, change);
}
