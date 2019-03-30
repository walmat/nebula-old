import semver from 'semver';

import initialState from './state';

/**
 * v0.2.1 Migrator
 *
 * A migrator is a special type of reducer that accepts a given state
 * and returns the necessary changes to make it a valid state for the
 * version associated with the migrator.
 *
 * The v0.2.1 Migrator updates the shipping manager state to include a
 * status property if it doesn't exist. This status property is used by
 * the ShippingManager component to determine whether the shipping manager
 * can run, or should be disabled (due to a run in progress).
 *
 * @param {*} state a v0.2.0 state
 * @returns a valid v0.2.1 state
 */
export default (state = initialState) => {
  // Set the status property on the settings shippping manager
  // state to "idle" if it doesn't already have a status set

  // Update version only if incoming state is less than 0.2.1
  const newVersion = semver.gt(state.version, '0.2.1') ? state.version : '0.2.1';
  return {
    ...state,
    version: newVersion,
    settings: {
      ...state.settings,
      shipping: {
        ...state.settings.shipping,
        status: state.settings.shipping.status || 'idle',
      },
    },
  };
};
