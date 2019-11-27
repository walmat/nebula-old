import prevState from '../v0.6.0/state';

const updateCredentials = credentials => ({
  ...credentials,
  name: null,
});

export default {
  ...prevState,
  version: '0.6.1',
  servers: {
    ...prevState.servers,
    credentials: {
      ...prevState.servers.credentials,
      current: {
        ...prevState.servers.credentials.current,
        name: null,
      },
      selected: {
        ...prevState.servers.credentials.selected,
        name: null,
      },
      list: prevState.servers.credentials.list.map(updateCredentials),
    },
  },
};
