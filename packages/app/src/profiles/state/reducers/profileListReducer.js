import uuidv4 from 'uuid/v4';

import { PROFILE_ACTIONS } from '../../../store/actions';
import { Profiles, Rates } from '../initial';

export default (state = Profiles, action) => {
  console.log('profile list reducer handling action: ', action);
  const { type } = action;

  if (type === PROFILE_ACTIONS.CREATE) {
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
    return [...state, profile];
  }

  if (type === PROFILE_ACTIONS.REMOVE) {
    const { id } = action;

    if (!id) {
      return state;
    }

    return state.filter(p => p.id !== id);
  }

  if (type === PROFILE_ACTIONS.UPDATE) {
    const { profile } = action;

    if (!profile) {
      return state;
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
