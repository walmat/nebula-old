import semver from 'semver';

import initialState from './state';

const initialShippingRatesState = [];
const initialShippingManagerErrorState = {
  profile: null,
  name: null,
  site: null,
  product: null,
  username: null,
  password: null,
};

const newInitialProfile = profile => ({
  ...profile,
  rates: initialShippingRatesState,
  selectedSite: null,
});

const initialShippingManagerState = profile => ({
  name: '',
  profile: newInitialProfile(profile),
  site: {
    name: null,
    url: null,
    supported: null,
    apiKey: null,
    auth: null,
  },
  product: {
    raw: '',
    variant: null,
    pos_keywords: null,
    neg_keywords: null,
    url: null,
  },
  username: '',
  password: '',
  errors: initialShippingManagerErrorState,
});

const addShippingRatesToProfile = profile => ({
  ...profile,
  rates: initialState.currentProfile.rates,
  selectedSite: initialState.currentProfile.selectedSite,
});

const updateTask = ({ profile, edits, ...rest }) => ({
  ...rest,
  profile: addShippingRatesToProfile(profile),
  edits: {
    ...edits,
    profile: edits.profile ? addShippingRatesToProfile(edits.profile) : edits.profile,
  },
});

export default (state = initialState) => {
  // Apply addShippingRatesToProfile to:
  // 1. All existing profiles
  //   - In profiles array
  //   - In tasks array
  // 2. CurrentProfile
  // 3. SelectedProfile
  // 4. New Task
  // 5. Selected Task
  // 6. Defaults

  // Update `Settings` with shipping manager state changes
  const newVersion = semver.gt(state.version, '0.2.0') ? state.version : '0.2.0';

  return {
    ...state,
    version: newVersion,
    profiles: state.profiles.map(addShippingRatesToProfile),
    currentProfile: addShippingRatesToProfile(state.currentProfile),
    selectedProfile: addShippingRatesToProfile(state.selectedProfile),
    tasks: state.tasks.map(updateTask),
    newTask: updateTask(state.newTask),
    selectedTask: updateTask(state.selectedTask),
    settings: {
      ...state.settings,
      shipping: initialShippingManagerState(state.currentProfile),
      defaults: {
        ...state.settings.defaults,
        profile: addShippingRatesToProfile(state.settings.defaults.profile),
        edits: {
          ...state.settings.defaults.edits,
          profile: addShippingRatesToProfile(state.settings.defaults.edits.profile),
        },
      },
    },
  };
};
