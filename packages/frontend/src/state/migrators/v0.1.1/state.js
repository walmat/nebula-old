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
// add in the initial state for shipping rates
const initialShippingRatesState = [];

const newInitialProfile = {
  ...prevState.currentProfile,
  billing: newInitialLocation,
  shipping: newInitialLocation,
  rates: initialShippingRatesState, // add in rates state
  selectedSite: null, // also, set the selected site to null
};

// initial state for errors (shipping manager)
const initialShippingManagerErrorState = {
  profile: null,
  name: null,
  site: null,
  product: null,
  username: null,
  password: null,
};

// initial shipping manager state definition
const initialShippingManagerState = {
  name: '',
  profile: newInitialProfile,
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
};

const newState = {
  ...prevState,
  version: '0.1.1',
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
    shipping: initialShippingManagerState,
  },
};

export default newState;
