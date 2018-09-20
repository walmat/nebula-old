/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
// import { combineReducers } from 'redux';
import { newTaskReducer, selectedTaskReducer } from './reducers/tasks/taskReducer';
import taskListReducer from './reducers/tasks/taskListReducer';
import { currentProfileReducer, selectedProfileReducer } from './reducers/profiles/profileReducer';
import profileListReducer from './reducers/profiles/profileListReducer';
import { serverReducer, serverListReducer, initialServerState, initialServerListState } from './reducers/server/serverReducer';
import settingsReducer from './reducers/settings/settingsReducer';
import { navbarReducer, initialNavbarState } from './reducers/navbar/navbarReducer';

import serverListOptions from '../utils/servers';
import { initialProfileStates } from '../utils/definitions/profileDefinitions';
import { initialTaskStates } from '../utils/definitions/taskDefinitions';
import { initialSettingsStates } from '../utils/definitions/settingsDefinitions';

/**
 * Application State
 */
export const initialState = {
  profiles: initialProfileStates.list,
  selectedProfile: initialProfileStates.profile,
  currentProfile: initialProfileStates.profile,
  tasks: initialTaskStates.list,
  newTask: initialTaskStates.task,
  navbar: initialNavbarState,
  selectedTask: initialTaskStates.task,
  settings: initialSettingsStates.settings,
  serverInfo: initialServerState,
  servers: initialServerListState,
  serverListOptions,
};

const topLevelReducer = (state = initialState, action) => {
  const changes = {
    tasks: taskListReducer(state.tasks, action),
    newTask: newTaskReducer(state.newTask, action),
    navbar: navbarReducer(state.navbar, action),
    selectedTask: selectedTaskReducer(state.selectedTask, action),
    profiles: profileListReducer(state.profiles, action),
    currentProfile: currentProfileReducer(state.currentProfile, action),
    selectedProfile: selectedProfileReducer(state.selectedProfile, action),
    settings: settingsReducer(state.settings, action),
    serverInfo: serverReducer(state.serverInfo, action),
    servers: serverListReducer(state.servers, action),
  };

  return Object.assign({}, state, changes);
};

export default topLevelReducer;
