import uuidv4 from 'uuid/v4';

import { PROFILE_ACTIONS } from '../../Actions';
import { profileReducer } from './ProfileReducer';

// TEMPORARY
import { initialProfileState } from './ProfileReducer';

export const initialProfileListState = [
  Object.assign({}, initialProfileState, {id: 0}),
  Object.assign({}, initialProfileState, {id: 1}),
  Object.assign({}, initialProfileState, {id: 2}),
];

export function profileListReducer(state = initialProfileListState, action) {
  // perform deep copy of given state
  let nextState = JSON.parse(JSON.stringify(state));

  switch (action.type) {
    case PROFILE_ACTIONS.ADD: {
      // perform a deep copy of given profile
      const newProfile = JSON.parse(JSON.stringify(action.value));

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
      // perform a deep copy of given state
      nextState = JSON.parse(JSON.stringify(state));

      // Filter out the given id
      nextState = nextState.filter(p => p.id === action.value);
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
    default:
      break;
  }

  return nextState;
}
