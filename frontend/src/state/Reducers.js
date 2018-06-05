/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
// import { combineReducers } from 'redux';
import { currentProfileReducer, initialProfileState } from './reducers/profiles/ProfileReducer';
import { profileListReducer, initialProfileListState } from './reducers/profiles/ProfileListReducer';

/**
 * Application State
 */
export const initialState = {
  profiles: initialProfileListState,
  selectedProfile: initialProfileState,
  currentProfile: initialProfileState,
};

const topLevelReducer = (state = initialState, action) => {
  const changes = {
    profiles: profileListReducer(state.profiles, action),
    currentProfile: currentProfileReducer(state.currentProfile, action),
  };

  return Object.assign({}, state, changes);
};

export default topLevelReducer;
