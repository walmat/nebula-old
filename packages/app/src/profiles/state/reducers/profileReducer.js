import {
  PROFILE_FIELDS,
  PROFILE_ACTIONS,
  mapProfileFieldToKey,
  SETTINGS_ACTIONS,
} from '../../../store/actions';
import locationReducer from './locationReducer';
import paymentReducer from './paymentReducer';
import { CurrentProfile, SelectedProfile } from '../initial';
import ratesReducer from './ratesReducer';

// shared reducer for current, and selected task
export const profileReducer = (state, action) => {
  const { type, field, value, subField } = action;

  if (!type || !mapProfileFieldToKey[field] || type !== PROFILE_ACTIONS.EDIT) {
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

  if (field === PROFILE_FIELDS.TOGGLE_MATCHES) {
    return { ...state, matches: !state.matches };
  }

  return state;
};

export const currentProfileReducer = (state = CurrentProfile, action) => {
  const { type } = action;

  if (type === PROFILE_ACTIONS.EDIT) {
    const { id } = action;

    if (!id) {
      return profileReducer(state, action);
    }
    return state;
  }

  if (type === PROFILE_ACTIONS.CREATE || type === PROFILE_ACTIONS.UPDATE) {
    const { profile } = action;

    if (!profile) {
      return state;
    }

    // reset back to init state
    return CurrentProfile;
  }

  if (type === PROFILE_ACTIONS.TRANSFER) {
    return { ...state, billing: state.shipping };
  }

  if (type === PROFILE_ACTIONS.LOAD) {
    const { profile } = action;

    if (!profile || (profile && !profile.id)) {
      return state;
    }

    profile.editId = profile.id;
    profile.id = null;
    return profile;
  }

  if (type === PROFILE_ACTIONS.REMOVE) {
    const { id } = action;

    if (!id || (id && action.id !== (state.id || state.editId))) {
      return state;
    }

    return CurrentProfile;
  }

  return state;
};

export const selectedProfileReducer = (state = SelectedProfile, action) => {
  const { type } = action;

  if (type === PROFILE_ACTIONS.SELECT) {
    const { profile } = action;

    if (!profile) {
      return state;
    }

    return profile;
  }

  if (type === PROFILE_ACTIONS.REMOVE) {
    const { id } = action;

    if (!id || id !== state.id) {
      return state;
    }

    // Return initial state
    return SelectedProfile;
  }

  if (type === PROFILE_ACTIONS.UPDATE) {
    const { id, profile } = action;

    if (!profile || state.id !== (id || profile.id)) {
      return state;
    }

    return profile;
  }

  return state;
};
