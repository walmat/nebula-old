import { PROFILE_FIELDS, PROFILE_ACTIONS } from '../../Actions';
import { locationReducer, initialLocationState } from './LocationReducer';
import { paymentReducer, initialPaymentState } from './PaymentReducer';

export const initialProfileState = {
  id: null,
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
  if (action.type === PROFILE_ACTIONS.EDIT) {
    switch (action.field) {
      case PROFILE_FIELDS.EDIT_SHIPPING:
        change = {
          shipping: locationReducer(
            state.shipping,
            { type: action.subField, value: action.value, errors: action.errors },
          ),
        };
        break;
      case PROFILE_FIELDS.EDIT_BILLING:
        change = {
          billing: locationReducer(
            state.billing,
            { type: action.subField, value: action.value, errors: action.errors },
          ),
        };
        break;
      case PROFILE_FIELDS.EDIT_PAYMENT:
        change = {
          payment: paymentReducer(
            state.payment,
            { type: action.subField, value: action.value, errors: action.errors },
          ),
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
  }

  return Object.assign({}, state, change);
}

export function currentProfileReducer(state = initialProfileState, action) {
  switch (action.type) {
    case PROFILE_ACTIONS.EDIT: {
      // only modify the current profile if the action id is null
      if (action.id == null) {
        return profileReducer(state, action);
      }
      break;
    }
    case PROFILE_ACTIONS.ADD: {
      // If adding a new profile, we should reset the current profile to default values
      return Object.assign({}, initialProfileState);
    }
    case PROFILE_ACTIONS.SELECT: {
      // If selecting a profile, we should return the profile that is given
      const selectedProfile = Object.assign({}, action.profile);
      selectedProfile.editId = selectedProfile.id;
      selectedProfile.id = null;

      return selectedProfile;
    }
    default:
      break;
  }

  return Object.assign({}, state);
}
