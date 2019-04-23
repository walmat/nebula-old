import semver from 'semver';

import initialState from './state';

/**
 * v0.4.0 Migrator
 *
 * A migrator is a special type of reducer that accepts a given state
 * and returns the necessary changes to make it a valid state for the
 * version associated with the migrator.
 *
 * The v0.4.0 Migrator filters out all task instances that don't have a valid id
 *
 * @param {*} state a v0.3.1 state
 * @returns a valid v0.4.0 state
 */
export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.4.0') ? state.version : '0.4.0';
  return {
    ...state,
    version: newVersion,
    tasks: state.tasks.filter(t => `${t.id}`.indexOf('-') === -1),
  };
};
