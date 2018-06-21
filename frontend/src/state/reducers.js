/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
// import { combineReducers } from 'redux';
import { taskReducer, currentTaskReducer, initialTaskState } from './reducers/tasks/taskReducer';
import {initialTaskListState, taskListReducer} from './reducers/tasks/taskListReducer';
import { currentProfileReducer, initialProfileState, selectedProfileReducer } from './reducers/profiles/profileReducer';
import { profileListReducer, initialProfileListState } from './reducers/profiles/profileListReducer';
import { serverReducer, initialServerState } from './reducers/server/serverReducer';
import { settingsReducer, initialSettingsState } from './reducers/settings/settingsReducer';

/**
 * Application State
 */
export const initialState = {
  profiles: initialProfileListState,
  selectedProfile: initialProfileState,
  currentProfile: initialProfileState,
  tasks: initialTaskListState,
  currentTask: initialTaskState,
  proxies: initialSettingsState,
  selectedServer: initialServerState,
  serverName: initialServerState,
  serverSize: initialServerState,
  serverLocation: initialServerState,
};

const topLevelReducer = (state = initialState, action) => {
  const changes = {
    // tasks: taskListReducer(state.tasks, action),
    currentTask: currentTaskReducer(state.currentTask, action),
    profiles: profileListReducer(state.profiles, action),
    currentProfile: currentProfileReducer(state.currentProfile, action),
    selectedProfile: selectedProfileReducer(state.selectedProfile, action),
    proxies: settingsReducer(state.proxies, action),
    selectedServer: serverReducer(state.selectedServer, action),
    serverName: serverReducer(state.serverName, action),
    serverSize: serverReducer(state.serverSize, action),
    serverLocation: serverReducer(state.serverLocation, action),
  };

  return Object.assign({}, state, changes);
};

export default topLevelReducer;
