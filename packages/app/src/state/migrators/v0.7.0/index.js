import semver from 'semver';
import initialState from './state';
import TYPES from '../../../constants/taskTypes';

const updateTask = task => ({
  ...task,
  type: TYPES.SAFE,
});

export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.7.0') ? state.version : '0.7.0';

  const newState = {
    ...state,
    version: newVersion,
    tasks: state.tasks.map(updateTask),
    newTask: updateTask(state.newTask),
    selectedTask: updateTask(state.selectedTask),
  };

  return newState;
};
