import prevState from '../v0.1.1/state';

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

const initialShippingManagerState = {
  name: '',
  profile: newInitialProfile(prevState.currentProfile),
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
  version: '0.2.0',
  profiles: prevState.profiles.map(newInitialProfile),
  currentProfile: newInitialProfile(prevState.currentProfile),
  selectedProfile: newInitialProfile(prevState.selectedProfile),
  newTask: {
    ...prevState.newTask,
    profile: newInitialProfile(prevState.newTask.profile),
  },
  selectedTask: {
    ...prevState.selectedTask,
    profile: newInitialProfile(prevState.selectedTask.profile),
  },
  settings: {
    ...prevState.settings,
    shipping: initialShippingManagerState,
    defaults: {
      ...prevState.settings.defaults,
      profile: newInitialProfile(prevState.settings.defaults.profile),
      edits: {
        ...prevState.settings.defaults.edits,
        profile: newInitialProfile(prevState.settings.defaults.edits.profile),
      },
    },
  },
};

export default newState;
