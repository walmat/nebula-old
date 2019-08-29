import semver from 'semver';
import initialState from './state';

const addAccountFields = () => ({
  list: [],
  selectedAccount: {
    username: '',
    password: '',
    name: '',
  },
});

export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.7.3') ? state.version : '0.7.3';

  const newState = {
    ...state,
    version: newVersion,
    settings: {
      ...state.settings,
      accounts: addAccountFields(),
    },
  };

  return newState;
};
