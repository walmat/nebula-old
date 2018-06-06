/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
// import { combineReducers } from 'redux';
import { taskReducer, initialTaskState } from "./reducers/tasks/TaskReducer";
import { taskListReducer, initialTaskListState } from './reducers/tasks/TaskListReducer';
import { currentProfileReducer, initialProfileState, selectedProfileReducer } from './reducers/profiles/ProfileReducer';
import { profileListReducer, initialProfileListState } from './reducers/profiles/ProfileListReducer';

/**
 * Application State
 */
export const initialState = {
  profiles: initialProfileListState,
  selectedProfile: initialProfileState,
  currentProfile: initialProfileState,
  tasks: [],
  selectedTask: initialTaskState,
  currentTask: initialTaskState
};

const topLevelReducer = (state = initialState, action) => {
  const changes = {
    currentTask: taskReducer(state.currentTask, action),
    tasks: taskListReducer(state.tasks, action),
    profiles: profileListReducer(state.profiles, action),
    currentProfile: currentProfileReducer(state.currentProfile, action),
    selectedProfile: selectedProfileReducer(state.selectedProfile, action),
  };

  return Object.assign({}, state, changes);
};

export default topLevelReducer;
