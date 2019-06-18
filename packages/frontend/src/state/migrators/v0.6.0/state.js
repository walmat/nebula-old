import prevState from '../v0.5.0/state';
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

const newState = {
  ...prevState.currentProfile,
  ...prevState.navbar,
  ...prevState.newTask,
  ...prevState.profiles,
  ...prevState.selectedProfile,
  ...prevState.selectedTask,
  ...prevState.servers,
  ...prevState.settings,
  ...prevState.tasks,
  ...prevState.theme,
  version: '0.6.0',
  servers: initialServersState,
};

export default newState;
