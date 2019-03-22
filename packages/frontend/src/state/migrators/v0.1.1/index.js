import semver from 'semver';

import initialState from './state';

const defaultCountry = { value: 'US', label: 'United States' };
const initialShippingRatesState = [];

const initialShippingManagerState = {
  ...initialState.settings.shipping,
};

// Take an existing location and update it to add the
// Default country if the country wasn't previously filled out
const addDefaultCountry = location => ({
  ...location,
  // Use default country if one isn't present...
  country: location.country || defaultCountry,
  errors: {
    ...location.errors,
    // Use existing error if country is present, otherwise use
    // false since default country is value
    country: location.country ? location.errors.country : false,
  },
});

// Helper method to call on profiles instead of needing to go a
// level deeper and use addDefaultCountry
const updateProfile = ({ billing, shipping, ...rest }) => ({
  ...rest,
  billing: addDefaultCountry(billing),
  shipping: addDefaultCountry(shipping),
  rates: initialShippingRatesState,
  selectedSite: null,
});

// Helper method to call on tasks instead of needing to go multiple
// levels deeper and use addDefaultCountry
const updateTask = ({ profile, edits, ...rest }) => ({
  ...rest,
  profile: updateProfile(profile),
  edits: {
    ...edits,
    profile: edits.profile ? updateProfile(edits.profile) : edits.profile,
  },
});

/**
 * v0.1.1 Migrator
 *
 * A migrator is a special type of reducer that accepts a given state
 * and returns the necessary changes to make it a valid state for the
 * version associated with the migrator.
 *
 * The v0.1.1 Migrator updates any existing profiles to use the default
 * country in their billing/shipping information. If an existing country
 * is already present, that value is used. This is meant to update new
 * profiles that might not have been filled out between runs of nebula
 *
 * @param {*} state a v0.1.0 state
 * @returns a valid v0.1.1 state
 */
export default (state = initialState) => {
  // Apply updateProfile to the following places:
  // 1. Any profiles in the profile list
  // 2. Current Profile
  // 3. SelectedProfile
  // 4. Any profiles in the task list (in the task, or the task edits)
  // 5. Selected Task
  // 6. New Task
  // 7. Any profiles in the settings defaults and deaults edits

  // update version only if incoming state is less than 0.1.1
  const newVersion = semver.gt(state.version, '0.1.1') ? state.version : '0.1.1';
  return {
    ...state,
    version: newVersion,
    profiles: state.profiles.map(updateProfile),
    currentProfile: updateProfile(state.currentProfile),
    selectedProfile: updateProfile(state.selectedProfile),
    tasks: state.tasks.map(updateTask),
    newTask: updateTask(state.newTask),
    selectedTask: updateTask(state.selectedTask),
    settings: {
      ...state.settings,
      defaults: {
        ...state.settings.defaults,
        profile: updateProfile(state.settings.defaults.profile),
        edits: {
          ...state.settings.defaults.edits,
          profile: updateProfile(state.settings.defaults.edits.profile),
        },
      },
      shipping: initialShippingManagerState,
    },
  };
};
