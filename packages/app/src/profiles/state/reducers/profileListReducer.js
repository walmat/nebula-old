import uuidv4 from 'uuid/v4';

import { PROFILE_ACTIONS, GLOBAL_ACTIONS } from '../../../store/actions';
import { Profiles, Rates } from '../initial';
import { SHIPPING_ACTIONS } from '../../../settings/state/actions';

export default (state = Profiles, action) => {
  const { type } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Profiles;
  }

  if (type === PROFILE_ACTIONS.CREATE_PROFILE) {
    const { profile } = action;

    if (!profile) {
      return state;
    }

    if (profile.matches) {
      profile.billing = profile.shipping;
    }

    // patch in rates initial state..
    profile.rates = Rates;

    // assign new id and check if generated id already exists
    let newId;
    const idCheck = p => p.id === newId;
    do {
      newId = uuidv4();
    } while (state.some(idCheck));

    // add new profile
    profile.id = newId;

    // copy over shipping info if the matches flag is true
    if (profile.matches) {
      profile.billing = profile.shipping;
    }

    return [...state, profile];
  }

  if (type === PROFILE_ACTIONS.REMOVE_PROFILE) {
    const { id } = action;

    if (!id) {
      return state;
    }

    return state.filter(p => p.id !== id);
  }

  if (type === PROFILE_ACTIONS.UPDATE_PROFILE) {
    const { profile } = action;

    if (!profile) {
      return state;
    }

    // copy over shipping info if the matches flag is true
    if (profile.matches) {
      profile.billing = profile.shipping;
    }

    return state.map(p => {
      if (p.id === profile.id) {
        return profile;
      }
      return p;
    });
  }

  if (type === SHIPPING_ACTIONS.FETCH_SHIPPING) {
    if (
      !action ||
      action.errors ||
      (action.response && (!action.response.rates || !action.response.selectedRate))
    ) {
      return state;
    }

    // deconstruct response
    const { id, store } = action.response;
    let { rates, selectedRate } = action.response;

    // filter out data we don't need (for now)...
    rates = rates.map(r => ({ name: r.title, price: r.price, rate: r.id }));
    selectedRate = { name: selectedRate.title, price: selectedRate.price, rate: selectedRate.id };

    return state.map(p => {
      if (p.id === id) {
        const ratesIdx = p.rates.findIndex(r => r.store.url === store.url);

        if (ratesIdx < 0) {
          return {
            ...p,
            rates: [
              ...p.rates,
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

        const newRates = p.rates.slice();

        const oldRates = p.rates[ratesIdx].rates.filter(
          r1 => !rates.find(r2 => r2.name === r1.name),
        );

        newRates.splice(ratesIdx, 0, oldRates);

        return {
          ...p,
          selectedRate: p.selectedRate || selectedRate,
          rates: newRates,
        };
      }
      return p;
    });
  }

  return state;
};
