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
  ...prevState,
  version: '0.6.0',
  servers: initialServersState,
};

delete newState.serverInfo;
export default newState;
