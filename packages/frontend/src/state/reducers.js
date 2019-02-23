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
import { navbarReducer, initialNavbarState } from './reducers/navbar/navbarReducer';
import { GLOBAL_ACTIONS } from './actions';
import serverListOptions from '../utils/servers';
import { initialProfileStates } from '../utils/definitions/profileDefinitions';
import { initialTaskStates } from '../utils/definitions/taskDefinitions';
import { initialSettingsStates } from '../utils/definitions/settingsDefinitions';
import { initialServerStates } from '../utils/definitions/serverDefinitions';
import { THEMES } from '../constants/themes';

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
  serverInfo: initialServerStates.serverInfo,
  servers: initialServerStates.serverList,
  serverListOptions,
  theme: THEMES.LIGHT,
};

const topLevelReducer = (state = initialState, action) => {
  // Return State if a null/undefined action is given
  if (!action) {
    return state;
  }
  // Check for reset and return initial state
  if (action.type === GLOBAL_ACTIONS.RESET) {
    return { ...initialState };
  }

  if (action.type === GLOBAL_ACTIONS.SET_THEME) {
    if (action.theme) {
      const { theme } = action;
      return {
        ...state,
        theme,
      };
    }
  }

  // If not a reset, handle the action with sub reducers
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
