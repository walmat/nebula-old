import semver from 'semver';
import initialState from './state';

export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.7.4') ? state.version : '0.7.4';

  const newState = {
    ...state,
    version: newVersion,
    settings: {
      ...state.settings,
      accounts: {
        ...state.settings.accounts,
        currentAccount: {
          username: '',
          password: '',
          name: '',
        },
        selectedAccount: null,
      },
    },
  };

  return newState;
};
