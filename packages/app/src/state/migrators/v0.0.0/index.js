import initialState from './state';

/**
 * v0.0.0 Migrator
 *
 * A migrator is a special type of reducer that accepts a given state
 * and returns the necessary changes to make it a valid state for the
 * version associated with the migrator.
 *
 * The v0.0.0 Migrator is unique in the fact that it doesn't have any
 * changes. This is an initial starting point that any state with no
 * version will start at. This will allow the chain of migrators to
 * be created to upgrade the state accordingly.
 *
 * @param {*} state any state
 * @returns a valid v0.0.0 state
 */
export default (state = initialState) => state;
