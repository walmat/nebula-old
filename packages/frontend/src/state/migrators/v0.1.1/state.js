import prevState from '../v0.1.0/state';

// Modify all profiles to default to united states
const defaultCountry = { value: 'US', label: 'United States' };

const remapLocation = existing => ({
  ...existing,
  // Use default country
  country: defaultCountry,
  errors: {
    ...existing.errors,
    // Default country is valid, so set error to false
    country: false,
  },
});

const newInitialLocation = remapLocation(prevState.currentProfile.billing);

const newInitialProfile = {
  ...prevState.currentProfile,
  billing: newInitialLocation,
  shipping: newInitialLocation,
};

const newState = {
  ...prevState,
  currentProfile: newInitialProfile,
  selectedProfile: newInitialProfile,
  newTask: {
    ...prevState.newTask,
    profile: newInitialProfile,
  },
  selectedTask: {
    ...prevState.selectedTask,
    profile: newInitialProfile,
  },
  settings: {
    ...prevState.settings,
    defaults: {
      ...prevState.settings.defaults,
      profile: newInitialProfile,
      edits: {
        ...prevState.settings.defaults.edits,
        profile: newInitialProfile,
      },
    },
  },
};

export default newState;
