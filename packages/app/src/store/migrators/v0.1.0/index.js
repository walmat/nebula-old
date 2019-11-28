import initialState from './state';

/**
 * v0.1.0 Migrator
 *
 * A migrator is a special type of reducer that accepts a given state
 * and returns the necessary changes to make it a valid state for the
 * version associated with the migrator.
 *
 * The v0.1.0 Migrator simply attaches the "version" key if it
 * doesn't exist and sets it to "0.1.0". No other changes are made
 * to the state tree.
 *
 * @param {*} state a v0.0.0 state
 * @returns a valid v0.1.0 state
 */
export default (state = initialState) => ({
  version: state.version || '0.1.0',
  ...state,
});
