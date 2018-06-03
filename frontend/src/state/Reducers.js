/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
import { combineReducers } from 'redux'
import { profileReducer, initialProfileState } from './reducers/profiles/ProfileReducer';

const topLevelReducer = (state = initialState, action) => {
  let changes = {
    currentProfile: profileReducer(state.currentProfile, action)
  };

  return Object.assign({}, state, changes);
}

export default topLevelReducer;

/**
 * Application State
 */
const initialState = {
  profiles: [],
  selectedProfile: initialProfileState,
  currentProfile: initialProfileState
};
