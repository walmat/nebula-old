import { PROFILE_FIELDS, PROFILE_ACTIONS, mapProfileFieldToKey } from '../../actions';
import locationReducer from './locationReducer';
import paymentReducer from './paymentReducer';
import initialProfileStates from '../../initial/profiles';

export function profileReducer(state = initialProfileStates.profile, action) {
  let change = {};
  if (action.type === PROFILE_ACTIONS.EDIT) {
    // If we can't map the field to a profile key, don't change anything
    if (!mapProfileFieldToKey[action.field]) {
      return Object.assign({}, state);
    }
    switch (action.field) {
      case PROFILE_FIELDS.EDIT_SHIPPING:
        change = {
          shipping: locationReducer(state.shipping, {
            type: action.subField,
            value: action.value,
            errors: action.errors,
          }),
        };
        break;
      case PROFILE_FIELDS.EDIT_BILLING:
        change = {
          billing: locationReducer(state.billing, {
            type: action.subField,
            value: action.value,
            errors: action.errors,
          }),
        };
        break;
      case PROFILE_FIELDS.EDIT_PAYMENT:
        change = {
          payment: paymentReducer(state.payment, {
            type: action.subField,
            value: action.value,
            errors: action.errors,
          }),
        };
        break;
      case PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING:
        change = {
          billingMatchesShipping: !state.billingMatchesShipping,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      default:
        change = {
          [mapProfileFieldToKey[action.field]]:
            action.value || initialProfileStates.profile[mapProfileFieldToKey[action.field]],
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
    }
  }
  return Object.assign({}, state, change);
}

export function currentProfileReducer(state = initialProfileStates.profile, action) {
  switch (action.type) {
    case PROFILE_ACTIONS.EDIT: {
      // only modify the current profile if the action id is null
      if (!action.id) {
        return profileReducer(state, action);
      }
      break;
    }
    case PROFILE_ACTIONS.ADD:
    case PROFILE_ACTIONS.UPDATE: {
      // If there's no profile, we should do nothing
      if (!action.profile) {
        break;
      }
      if (action.errors) {
        return Object.assign({}, state, {
          errors: Object.assign({}, state.errors, action.errors),
        });
      }

      // If adding a new profile, we should reset the current profile to default values
      return Object.assign({}, initialProfileStates.profile);
    }
    case PROFILE_ACTIONS.LOAD: {
      // If we have no profile, or the profile doesn't have an id, do nothing
      if (!action.profile || (action.profile && !action.profile.id)) {
        break;
      }
      // If selecting a profile, we should return the profile that is given
      const loadedProfile = Object.assign({}, action.profile);
      loadedProfile.editId = loadedProfile.id;
      loadedProfile.id = null;

      return loadedProfile;
    }
    case PROFILE_ACTIONS.REMOVE: {
      // If we have no id, we should do nothing
      if (!action.id) {
        break;
      }

      // Check if we are removing the current profile
      if (action.id === (state.id || state.editId)) {
        // Return initial state
        return Object.assign({}, initialProfileStates.profile);
      }
      break;
    }
    default:
      break;
  }

  return Object.assign({}, state);
}

export function selectedProfileReducer(state = initialProfileStates.profile, action) {
  switch (action.type) {
    case PROFILE_ACTIONS.SELECT: {
      // If profile wasn't passed, don't do anything
      if (!action.profile) {
        break;
      }
      // Set the next state to the selected profile
      return Object.assign({}, action.profile);
    }
    case PROFILE_ACTIONS.REMOVE: {
      // If we have no id, we should do nothing
      if (!action.id) {
        break;
      }

      // Check if we are removing the current profile
      if (action.id === state.id) {
        // Return initial state
        return Object.assign({}, initialProfileStates.profile);
      }

      break;
    }
    case PROFILE_ACTIONS.UPDATE: {
      if (action.profile && state.id === (action.id || action.profile.id)) {
        return Object.assign({}, action.profile);
      }
      break;
    }
    default:
      break;
  }

  return Object.assign({}, state);
}
