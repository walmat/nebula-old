import { PROFILE_FIELDS, PROFILE_ACTIONS } from '../../actions';
import { locationReducer, initialLocationState } from './locationReducer';
import { paymentReducer, initialPaymentState } from './paymentReducer';

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
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      case PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING:
        change = {
          billingMatchesShipping: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      case PROFILE_FIELDS.EDIT_NAME:
        change = {
          profileName: action.value,
          errors: Object.assign({}, state.errors, action.errors),
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
      // If we have a response error, we should do nothing
      if (action.response !== undefined && action.response.error !== undefined) {
        return Object.assign({}, action.profile);
      }

      // If adding a new profile, we should reset the current profile to default values
      return Object.assign({}, initialProfileState);
    }
    case PROFILE_ACTIONS.UPDATE: {
      // If we have a response error, we should do nothing
      if (action.response !== undefined && action.response.error !== undefined) {
        return Object.assign({}, action.profile);
      }

      // If updating an existing profile, we should reset the current profile to default values
      return Object.assign({}, initialProfileState);
    }
    case PROFILE_ACTIONS.LOAD: {
      // If selecting a profile, we should return the profile that is given
      const loadedProfile = Object.assign({}, action.profile);
      loadedProfile.editId = loadedProfile.id;
      loadedProfile.id = null;

      return loadedProfile;
    }
    case PROFILE_ACTIONS.REMOVE: {
      // If we have a response error, we should do nothing
      if (action.response !== undefined && action.response.error !== undefined) {
        return Object.assign({}, state);
      }

      // Check if we are removing the current profile
      if (action.id === state.id) {
        // Return initial state
        return Object.assign({}, initialProfileState);
      }

      break;
    }
    default:
      break;
  }

  return Object.assign({}, state);
}

export function selectedProfileReducer(state = initialProfileState, action) {
  switch (action.type) {
    case PROFILE_ACTIONS.SELECT: {
      // Set the next state to the selected profile
      return Object.assign({}, action.profile);
    }
    case PROFILE_ACTIONS.REMOVE: {

        // If we have a response error, we should do nothing
      if (action.response !== undefined && action.response.error !== undefined) {
        return Object.assign({}, state);
      }

      // Check if we are removing the current profile
      if (action.id === state.id) {
        // Return initial state
        return Object.assign({}, initialProfileState);
      }

      break;
    }
    default:
      break;
  }

  return Object.assign({}, state);
}
