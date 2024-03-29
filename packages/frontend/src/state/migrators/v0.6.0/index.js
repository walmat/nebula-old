import semver from 'semver';
import initialState from './state';
import serverListOptions from '../../../constants/servers';

const initialServersState = {
  proxies: [],
  proxyOptions: {
    number: '',
    credentials: null,
    location: null,
    username: '',
    password: '',
    errors: null,
  },
  serverListOptions,
  credentials: {
    selected: {
      AWSAccessKey: null,
      AWSSecretKey: null,
    },
    current: {
      AWSAccessKey: null,
      AWSSecretKey: null,
    },
    list: [],
  },
};

export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.6.0') ? state.version : '0.6.0';

  const {
    currentProfile,
    navbar,
    newTask,
    profiles,
    selectedProfile,
    selectedTask,
    settings,
    tasks,
    theme,
  } = state;

  const newState = {
    ...state,
    currentProfile,
    navbar,
    newTask,
    profiles,
    selectedProfile,
    selectedTask,
    settings,
    tasks,
    theme,
    version: newVersion,
    servers: initialServersState,
  };

  return newState;
};
