import uuidv4 from 'uuid/v4';

import { PROFILE_ACTIONS, GLOBAL_ACTIONS } from '../../../store/actions';
import { Profiles, Rates } from '../initial';

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

  return state;
};
