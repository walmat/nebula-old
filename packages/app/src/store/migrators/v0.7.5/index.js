import semver from 'semver';
import initialState from './state';

const updateTask = task => {
  const newTask = task;
  delete newTask.username;
  delete newTask.password;
  delete newTask.log;

  newTask.account = null;

  return newTask;
};

export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.7.5') ? state.version : '0.7.5';

  const newState = {
    ...state,
    version: newVersion,
    newTask: updateTask(state.newTask),
    selectedTask: updateTask(state.selectedTask),
    tasks: state.tasks.map(updateTask),
  };

  return newState;
};
