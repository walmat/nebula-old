import prevState from '../v0.7.3/state';

export default {
  ...prevState,
  version: '0.7.4',
  settings: {
    ...prevState.settings,
    accounts: {
      ...prevState.settings.accounts,
      currentAccount: {
        username: '',
        password: '',
        name: '',
      },
      selectedAccount: null,
    },
  },
};
