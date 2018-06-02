import { EDIT_SHIPPING } from '../../actions/Actions';
import locationReducer from './LocationReducer';

const initialProfileState = {
  id: 0,
  profileName: '',
  errors: {},
  billingMatchesShipping: false,
  shipping: {},
  billing: {},
  payment: {}
}

export function profileReducer(state = initialProfileState, action) {
  switch(action.field) {
    case EDIT_SHIPPING:
      let change = {
        shipping: locationReducer(state.shipping, {field: action.subfield, value: action.value})
      };
      return Object.assign({}, state, change);
    default:
      return state;
  }
}
