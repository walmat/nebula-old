import uuidv4 from 'uuid/v4';

import { PROFILE_ACTIONS } from '../../Actions';
import { profileReducer } from './ProfileReducer';

// TEMPORARY
import { initialProfileState } from './ProfileReducer';

export const initialProfileListState = [
  Object.assign({}, initialProfileState, {id: 0, profileName: 'test1'}),
  Object.assign({}, initialProfileState, {id: 1, profileName: 'test2'}),
  Object.assign({}, initialProfileState, {id: 2, profileName: 'test3'}),
];

export function profileListReducer(state = initialProfileListState, action) {
  // perform deep copy of given state
  let nextState = JSON.parse(JSON.stringify(state));

  switch (action.type) {
    case PROFILE_ACTIONS.ADD: {
      // If we have a response error, we should do nothing
      if(action.response !== undefined && action.response.error !== undefined) {
        console.log(`ERROR with PROFILE ADD`);
        console.log(action.response);
        break;
      }

      // perform a deep copy of given profile
      const newProfile = JSON.parse(JSON.stringify(action.profile));
      if (newProfile.billingMatchesShipping) {
        newProfile.billing = newProfile.shipping;
      }

      // assign new id
      let newId = uuidv4();

      // check if generated id already exists
      const idCheck = p => p.id === newId;
      while (nextState.some(idCheck)) {
        newId = uuidv4();
      }

      // add new profile
      newProfile.id = newId;
      nextState.push(newProfile);
      break;
    }
    case PROFILE_ACTIONS.REMOVE: {
      // If we have a response error, we should do nothing
      if(action.response !== undefined && action.response.error !== undefined) {
        console.log(`ERROR with PROFILE REMOVE`);
        console.log(action.response);
        break;
      }

      // perform a deep copy of given state
      nextState = JSON.parse(JSON.stringify(state));

      // Filter out the given id
      nextState = nextState.filter(p => p.id === action.id);
      break;
    }
    case PROFILE_ACTIONS.EDIT: {
      // check if id is given (we only change the state on a non-null id)
      if (action.id == null) {
        break;
      }

      // find the element with the given id
      const found = nextState.find((p => p.id === action.id));
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
      // If we have a response error, we should do nothing
      if(action.response !== undefined && action.response.error !== undefined) {
        console.log(`ERROR with PROFILE UPDATE`);
        console.log(action.response);
        break;
      }

      // check if id is given (we only change the state on a non-null id)
      if (action.id == null) {
        break;
      }

      // find the element with the given id
      const found = nextState.find((p => p.id === action.id));
      if (found === undefined) {
        break;
      }
      // find the index of the old object
      const idx = nextState.indexOf(found);

      // Update the profile value with the one that was given to us
      nextState[idx] = Object.assign({}, action.profile, { id: action.id });
      break;
    }
    default:
      break;
  }

  return nextState;
}
