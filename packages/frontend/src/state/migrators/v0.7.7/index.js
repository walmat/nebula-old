import semver from 'semver';
import initialState from './state';

const Platforms = {
  Shopify: 'Shopify',
  Footsites: 'Footsites',
  Supreme: 'Supreme',
  Mesh: 'Mesh',
};

const updateTask = task => {
  const newTask = task;
  newTask.platform = Platforms.Shopify;

  return newTask;
};

export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.7.7') ? state.version : '0.7.7';

  const newState = {
    ...state,
    version: newVersion,
    newTask: updateTask(state.newTask),
    selectedTask: updateTask(state.selectedTask),
    tasks: state.tasks.map(updateTask),
  };

  return newState;
};
