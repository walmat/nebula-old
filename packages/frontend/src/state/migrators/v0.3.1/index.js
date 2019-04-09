import semver from 'semver';

import initialState from './state';

const updateTask = task => ({
  ...task,
  product: {
    ...task.product,
    found: null,
  },
  proxy: null,
  log: [],
});

/**
 * v0.3.1 Migrator
 *
 * A migrator is a special type of reducer that accepts a given state
 * and returns the necessary changes to make it a valid state for the
 * version associated with the migrator.
 *
 * The v0.3.1 Migrator updates the all task instances to include a
 * `proxy`, `log`, and `chosenProduct` field.
 *
 * @param {*} state a v0.3.0 state
 * @returns a valid v0.3.1 state
 */
export default (state = initialState) => {
  // Add a `proxy` property in all task entities
  // Add a `log` property in all task entities

  const newVersion = semver.gt(state.version, '0.3.1') ? state.version : '0.3.1';
  return {
    ...state,
    version: newVersion,
    newTask: updateTask(state.newTask),
    tasks: state.tasks.map(updateTask),
    selectedTask: updateTask(state.selectedTask),
  };
};
