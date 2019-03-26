import uuidv4 from 'uuid/v4';

import { PROFILE_ACTIONS, SETTINGS_ACTIONS } from '../../actions';
import { profileReducer } from './profileReducer';
import initialProfileStates from '../../initial/profiles';

export default function profileListReducer(state = initialProfileStates.list, action) {
  // perform deep copy of given state
  let nextState = JSON.parse(JSON.stringify(state));

  switch (action.type) {
    case PROFILE_ACTIONS.ADD: {
      // If errors, no id, or no profile is defined, exit early
      if (action.errors || !action.profile) {
        break;
      }

      // perform a deep copy of given profile
      const newProfile = JSON.parse(JSON.stringify(action.profile));
      if (newProfile.billingMatchesShipping) {
        newProfile.billing = newProfile.shipping;
      }

      // assign new id and check if generated id already exists
      let newId;
      const idCheck = p => p.id === newId;
      do {
        newId = uuidv4();
      } while (nextState.some(idCheck));

      // add new profile
      newProfile.id = newId;
      nextState.push(newProfile);
      break;
    }
    case PROFILE_ACTIONS.REMOVE: {
      // perform a deep copy of given state
      nextState = JSON.parse(JSON.stringify(state));

      // Filter out the given id
      nextState = nextState.filter(p => p.id !== action.id);
      break;
    }
    case PROFILE_ACTIONS.EDIT: {
      // check if id is given (we only change the state on a non-null id)
      if (action.id == null) {
        break;
      }

      // find the element with the given id
      const found = nextState.find(p => p.id === action.id);
      if (found === undefined) {
        break;
      }
      // find the index of the old object
      const idx = nextState.indexOf(found);

      // Reduce the found profile using our profile reducer
      nextState[idx] = profileReducer(found, action);
      break;
    }
    case PROFILE_ACTIONS.UPDATE: {
      // check if there are any errors
      // check if id is given (we only change the state on a non-null id)
      // check if profile is given (we only change the state if profile is given)
      if (action.errors || !action.id || !action.profile) {
        break;
      }

      // find the element with the given id
      const found = nextState.find(p => p.id === action.id);
      if (found === undefined) {
        break;
      }
      // find the index of the old object
      const idx = nextState.indexOf(found);

      // Update the profile value with the one that was given to us
      nextState[idx] = Object.assign({}, action.profile, { id: action.id });
      break;
    }
    case SETTINGS_ACTIONS.FETCH_SHIPPING: {
      if (
        !action ||
        (action && action.errors) ||
        (action && action.response && !action.response.rates) ||
        (action && action.response && !action.response.selectedRate)
      ) {
        break;
      }

      // deconstruct response
      const { id, site, rates, selectedRate } = action.response;

      // find the profile that we were using to fetch shipping rates
      const profile = nextState.find(p => p.id === id);

      // if the profile was removed somehow, don't do anything
      if (!profile) {
        break;
      }

      // find the index of the profile object in the state
      const profileIdx = nextState.indexOf(profile);

      // see if we already have an entry for that site
      const ratesForSite = nextState[profileIdx].rates.find(r => r.site.url === site.url);

      const ratesIdx = nextState[profileIdx].rates.indexOf(ratesForSite);

      // if we don't have an entry for that site
      if (!ratesForSite) {
        // push a new entry onto the rates array
        profile.rates.push({ site: { name: site.name, url: site.url }, rates, selectedRate });
        break;
      }
      // reset the selected rate to the new one
      ratesForSite.selectedRate = selectedRate;
      // add to the rates array
      // TODO - maybe do some added logic here to not add already existing rates
      const newRates = ratesForSite.rates.concat(rates);
      ratesForSite.rates = newRates;

      // finally, update the index in the nextState array
      nextState[profileIdx].rates[ratesIdx] = ratesForSite;
      break;
    }
    case PROFILE_ACTIONS.ERROR: {
      // TODO: Handle Error
      console.error(`Error trying to perform: ${action.action}! Reason: ${action.error}`);
      break;
    }
    default:
      break;
  }

  return nextState;
}
