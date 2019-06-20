import semver from 'semver';
import initialState from './state';

const updateCredentials = credentials => ({
  ...credentials,
  name: credentials.name || null,
});

export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.6.1') ? state.version : '0.6.1';

  const newState = {
    ...state,
    version: newVersion,
    servers: {
      ...state.servers,
      credentials: {
        ...state.servers.credentials,
        current: {
          ...state.servers.credentials.current,
          name: null,
        },
        selected: {
          ...state.servers.credentials.selected,
          name: null,
        },
        list: state.servers.credentials.list.map(updateCredentials),
      },
    },
  };
  return newState;
};
