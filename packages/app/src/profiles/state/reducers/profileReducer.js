import {
  PROFILE_FIELDS,
  PROFILE_ACTIONS,
  GLOBAL_ACTIONS,
  mapProfileFieldToKey,
} from '../../../store/actions';
import locationReducer from './locationReducer';
import paymentReducer from './paymentReducer';
import { CurrentProfile, profile as profileState } from '../initial';
import ratesReducer from './ratesReducer';

// shared reducer for current, and selected task
export const profileReducer = (state = profileState, action) => {
  const { type, field, value, subField } = action;

  if (!type || !mapProfileFieldToKey[field] || type !== PROFILE_ACTIONS.EDIT_PROFILE) {
    return state;
  }

  if (field === PROFILE_FIELDS.EDIT_SHIPPING) {
    return { ...state, shipping: locationReducer(state.shipping, { type: subField, value }) };
  }

  if (field === PROFILE_FIELDS.EDIT_BILLING) {
    return { ...state, billing: locationReducer(state.billing, { type: subField, value }) };
  }

  if (field === PROFILE_FIELDS.EDIT_PAYMENT) {
    return { ...state, payment: paymentReducer(state.payment, { type: subField, value }) };
  }

  if (field === PROFILE_FIELDS.EDIT_RATES) {
    return { ...state, rates: ratesReducer(state.rates, { type: subField, value }) };
  }

  if (field === PROFILE_FIELDS.EDIT_NAME) {
    return { ...state, name: value };
  }

  if (field === PROFILE_FIELDS.TOGGLE_MATCHES) {
    return { ...state, matches: !state.matches };
  }

  return state;
};

export const currentProfileReducer = (state = CurrentProfile, action) => {
  const { type } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return CurrentProfile;
  }

  if (type === PROFILE_ACTIONS.EDIT_PROFILE) {
    return profileReducer(state, action);
  }

  if (type === PROFILE_ACTIONS.SELECT_PROFILE) {
    const { profile } = action;

    if (!profile) {
      return state;
    }

    return profile;
  }

  if (type === PROFILE_ACTIONS.CREATE_PROFILE || type === PROFILE_ACTIONS.UPDATE_PROFILE) {
    const { profile } = action;

    if (!profile) {
      return state;
    }

    // reset back to init state
    return CurrentProfile;
  }

  if (type === PROFILE_ACTIONS.TRANSFER_SHIPPING) {
    return { ...state, billing: state.shipping };
  }

  if (type === PROFILE_ACTIONS.LOAD_PROFILE) {
    const { profile } = action;

    if (!profile || (profile && !profile.id)) {
      return state;
    }

    return profile;
  }

  if (type === PROFILE_ACTIONS.REMOVE_PROFILE) {
    const { id } = action;

    if (!id || id !== state.id) {
      return state;
    }

    return CurrentProfile;
  }

  return state;
};
