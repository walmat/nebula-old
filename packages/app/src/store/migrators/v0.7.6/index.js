import semver from 'semver';
import initialState from './state';

const updateTaskEdits = task => {
  const newTask = task;
  delete newTask.edits.sizes;
  delete newTask.edits.username;
  delete newTask.edits.password;

  return newTask;
};

export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.7.6') ? state.version : '0.7.6';

  const newState = {
    ...state,
    version: newVersion,
    selectedTask: updateTaskEdits(state.selectedTask),
    tasks: state.tasks.map(updateTaskEdits),
  };

  return newState;
};
