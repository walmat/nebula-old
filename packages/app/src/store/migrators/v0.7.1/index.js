import semver from 'semver';
import initialState from './state';

const updateTask = task => {
  const newTask = {
    ...task,
    forceCaptcha: false,
  };

  delete newTask.isQueueBypass;
  return newTask;
};

export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.7.1') ? state.version : '0.7.1';

  const newState = {
    ...state,
    version: newVersion,
    tasks: state.tasks.map(updateTask),
    newTask: updateTask(state.newTask),
    selectedTask: updateTask(state.selectedTask),
  };

  return newState;
};
