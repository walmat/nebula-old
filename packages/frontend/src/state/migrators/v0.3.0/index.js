import semver from 'semver';

import initialState from './state';

const updateTask = task => ({ ...task, chosenSizes: task.sizes });

/**
 * v0.3.0 Migrator
 *
 * A migrator is a special type of reducer that accepts a given state
 * and returns the necessary changes to make it a valid state for the
 * version associated with the migrator.
 *
 * The v0.3.0 Migrator updates the all task instances to include a
 * `chosenSizes` field. It then uses this when running for restocks
 * or monitor (when random) to display the properly found size.
 *
 * @param {*} state a v0.2.1 state
 * @returns a valid v0.3.0 state
 */
export default (state = initialState) => {
  // Add a `chosenSizes` property in all task entities

  const newVersion = semver.gt(state.version, '0.3.0') ? state.version : '0.3.0';
  return {
    ...state,
    version: newVersion,
    newTask: updateTask(state.newTask),
    tasks: state.tasks.map(updateTask),
    selectedTask: updateTask(state.selectedTask),
  };
};
