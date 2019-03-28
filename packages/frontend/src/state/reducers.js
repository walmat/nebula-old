/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
import { newTaskReducer, selectedTaskReducer } from './reducers/tasks/taskReducer';
import taskListReducer from './reducers/tasks/taskListReducer';
import { currentProfileReducer, selectedProfileReducer } from './reducers/profiles/profileReducer';
import profileListReducer from './reducers/profiles/profileListReducer';
import { serverReducer, serverListReducer } from './reducers/server/serverReducer';
import settingsReducer from './reducers/settings/settingsReducer';
import navbarReducer from './reducers/navbar/navbarReducer';
import { GLOBAL_ACTIONS } from './actions';
import topLevelMigrator, { initialState } from './migrators';

const topLevelReducer = (startState, action) => {
  // Return State if a null/undefined action is given
  if (!action) {
    return startState || initialState;
  }

  // Check for migration and perform it
  if (action.type === GLOBAL_ACTIONS.MIGRATE_STATE) {
    return topLevelMigrator(startState);
  }

  // Check for reset and return initial state
  if (action.type === GLOBAL_ACTIONS.RESET) {
    return { ...initialState };
  }

  // Use initial state if start state isn't given
  const state = startState || initialState;

  // Check for set theme and adjust it here
  if (action.type === GLOBAL_ACTIONS.SET_THEME) {
    if (action.theme) {
      const { theme } = action;
      return {
        ...state,
        theme,
      };
    }
    return { ...state };
  }

  // If not a global action, handle the action with sub reducers
  const changes = {
    tasks: taskListReducer(state.tasks, action),
    newTask: newTaskReducer(state.newTask, action, state.settings.defaults),
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
