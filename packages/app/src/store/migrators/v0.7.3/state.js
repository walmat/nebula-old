import prevState from '../v0.7.2/state';

const addAccountFields = () => ({
  list: [],
  selectedAccount: {
    username: '',
    password: '',
    name: '',
  },
});

export default {
  ...prevState,
  version: '0.7.3',
  settings: {
    ...prevState.settings,
    accounts: addAccountFields(),
  },
};
