/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
// import { combineReducers } from 'redux';
import { profileReducer, initialProfileState } from './reducers/profiles/ProfileReducer';
import { taskReducer, initialTaskState } from "./reducers/tasks/TaskReducer";
import { taskListReducer, initialTaskListState } from './reducers/tasks/TaskListReducer';

/**
 * Application State
 */
export const initialState = {
  profiles: [],
  selectedProfile: initialProfileState,
  currentProfile: initialProfileState,
  tasks: [],
  selectedTask: initialTaskState,
  currentTask: initialTaskState
};

const topLevelReducer = (state = initialState, action) => {
  const changes = {
    currentProfile: profileReducer(state.currentProfile, action),
    currentTask: taskReducer(state.currentTask, action),
    tasks: taskListReducer
  };

  return Object.assign({}, state, changes);
};

export default topLevelReducer;
