import {
  PROFILE_FIELDS,
  PROFILE_ACTIONS,
  SHIPPING_ACTIONS,
  GLOBAL_ACTIONS,
  mapProfileFieldToKey,
} from '../../../store/actions';
import locationReducer from './locationReducer';
import paymentReducer from './paymentReducer';
import { CurrentProfile, profile as profileState } from '../initial';
import ratesReducer from './ratesReducer';

// shared reducer for current, and selected task
export const profileReducer = (state = profileState, action = {}) => {
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

  if (field === PROFILE_FIELDS.EDIT_SELECTED_STORE) {
    return { ...state, selectedStore: value };
  }

  return state;
};

export const currentProfileReducer = (state = CurrentProfile, action = {}) => {
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

  if (type === PROFILE_ACTIONS.DELETE_RATE) {
    const { store, rate } = action;

    if (!store || !rate) {
      return state;
    }

    // get site object that corresponds to action's site
    const storeObj = state.rates.find(r => r.store.url === store.value);

    // reset the selectedRate
    storeObj.selectedRate = null;
    // remove the passed in rate field from the rates array
    storeObj.rates = storeObj.rates.filter(r => r.rate !== rate.rate);

    // check to see if the rates array is empty,
    // if so, remove the store obj itself from the
    if (storeObj.rates.length === 0) {
      // delete the store entry entirely if it's the last entry
      const idx = state.rates.indexOf(storeObj);
      const found = state.rates[idx];
      if (found) {
        state.rates.splice(idx, 1);
      }
    }

    return { ...state, selectedStore: null };
  }

  if (type === SHIPPING_ACTIONS.FETCH_SHIPPING) {
    if (
      !action ||
      !action.response ||
      !state.id ||
      !action.response.rates ||
      !action.response.selectedRate ||
      action.response.id !== state.id
    ) {
      return state;
    }

    const { store } = action.response;
    let { rates, selectedRate } = action.response;

    // filter out data we don't need (for now)...
    rates = rates.map(r => ({ name: r.title, price: r.price, rate: r.id }));
    selectedRate = { name: selectedRate.title, price: selectedRate.price, rate: selectedRate.id };

    const ratesIdx = state.rates.findIndex(r => r.store.url === store.url);

    if (ratesIdx < 0) {
      return {
        ...state,
        rates: [
          ...state.rates,
          {
            store: {
              name: store.name,
              url: store.url,
            },
            rates,
            selectedRate,
          },
        ],
      };
    }

    const newProfile = { ...state };

    newProfile.rates[ratesIdx].selectedRate = selectedRate;
    // filter out duplicate rates from the previously stored rates
    const oldRates = newProfile.rates[ratesIdx].rates.filter(
      r1 => !rates.find(r2 => r2.name === r1.name),
    );
    newProfile.rates[ratesIdx].rates = oldRates.concat(rates);

    return newProfile;
  }

  return state;
};
