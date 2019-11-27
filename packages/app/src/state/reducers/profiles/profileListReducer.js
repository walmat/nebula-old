import uuidv4 from 'uuid/v4';

import { PROFILE_ACTIONS, SETTINGS_ACTIONS } from '../../actions';
import { profileReducer } from './profileReducer';
import initialProfileStates from '../../initial/profiles';
import dsmlRates from '../../../constants/dsmlRates';

export default function profileListReducer(state = initialProfileStates.list, action) {

  console.log('profile list reducer handling action: ', action);

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

      const rate = dsmlRates[newProfile.shipping.country.value];
      if (rate) {
        newProfile.rates = [
          {
            site: {
              name: 'DSM UK',
              url: 'https://eflash.doverstreetmarket.com',
            },
            rates: [rate],
            selectedRate: rate,
          },
        ];
      } else {
        newProfile.rates = initialProfileStates.rates;
      }

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

      const newRates = [...action.profile.rates];
      // Calculate new dsml rate based on country
      const rate = dsmlRates[action.profile.shipping.country.value];
      // check for existing dsml rate
      const existingRateIdx = newRates.findIndex(r => r.site.name === 'DSM UK');
      if (existingRateIdx !== -1) {
        // we have an existing dsml rate
        if (rate) {
          // we have a supported country, update the existing dsml rate to the new one
          newRates[existingRateIdx] = {
            site: {
              name: 'DSM UK',
              url: 'https://eflash.doverstreetmarket.com',
            },
            rates: [rate],
            selectedRate: rate,
          };
        } else {
          // we don't have a supported country, remove the existing rate, so we don't use
          // the old country's rate
          newRates.splice(existingRateIdx, 1);
        }
      }

      // Update the profile value with the one that was given to us
      nextState[idx] = Object.assign({}, action.profile, { id: action.id });
      break;
    }
    case SETTINGS_ACTIONS.FETCH_SHIPPING: {
      if (
        !action ||
        action.errors ||
        (action.response && (!action.response.rates || !action.response.selectedRate))
      ) {
        break;
      }

      // deconstruct response
      const { id, site } = action.response;
      let { rates, selectedRate } = action.response;

      // filter out data we don't need (for now)...
      rates = rates.map(r => ({ name: r.title, price: r.price, rate: r.id }));
      selectedRate = { name: selectedRate.title, price: selectedRate.price, rate: selectedRate.id };
      // find the profile that we were using to fetch shipping rates
      const profile = nextState.find(p => p.id === id);

      // if the profile was removed somehow, don't do anything
      if (!profile) {
        break;
      }

      const ratesIdx = profile.rates.findIndex(r => r.site.url === site.url);
      if (ratesIdx < 0) {
        profile.rates.push({ site: { name: site.name, url: site.url }, rates, selectedRate });
      } else {
        profile.rates[ratesIdx].selectedRate = selectedRate;
        // filter out duplicate rates from the previously stored rates
        const oldRates = profile.rates[ratesIdx].rates.filter(
          r1 => !rates.find(r2 => r2.name === r1.name),
        );
        profile.rates[ratesIdx].rates = oldRates.concat(rates);
      }
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
