import PropTypes from 'prop-types';

export const account = PropTypes.shape({
  id: PropTypes.string,
  name: PropTypes.string,
  username: PropTypes.string,
  password: PropTypes.string,
});

export const list = PropTypes.arrayOf(account);

const accountManager = PropTypes.shape({
  list,
  selectedAccount: account,
  currentAccount: account,
});

export default accountManager;
