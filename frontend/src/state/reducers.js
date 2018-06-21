/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
// import { combineReducers } from 'redux';
import { taskReducer, initialTaskState } from './reducers/tasks/taskReducer';
import { initialTaskListState } from './reducers/tasks/taskListReducer';
import { currentProfileReducer, initialProfileState, selectedProfileReducer } from './reducers/profiles/profileReducer';
import { profileListReducer, initialProfileListState } from './reducers/profiles/profileListReducer';
import { serverReducer, initialServerState } from './reducers/server/serverReducer';
import { settingsReducer, initialSettingsState } from './reducers/settings/settingsReducer';

import serverListOptions from '../utils/servers';

/**
 * Application State
 */
export const initialState = {
  profiles: initialProfileListState,
  selectedProfile: initialProfileState,
  currentProfile: initialProfileState,
  tasks: initialTaskListState,
  selectedTask: initialTaskState,
  currentTask: initialTaskState,
  proxies: initialSettingsState,
  selectedServer: initialServerState,
  serverListOptions,
};

const topLevelReducer = (state = initialState, action) => {
  const changes = {
    currentTask: taskReducer(state.currentTask, action),
    // tasks: taskListReducer(state.tasks, action),
    profiles: profileListReducer(state.profiles, action),
    currentProfile: currentProfileReducer(state.currentProfile, action),
    selectedProfile: selectedProfileReducer(state.selectedProfile, action),
    proxies: settingsReducer(state.proxies, action),
    selectedServer: serverReducer(state.selectedServer, action),
  };

  return Object.assign({}, state, changes);
};

export default topLevelReducer;
