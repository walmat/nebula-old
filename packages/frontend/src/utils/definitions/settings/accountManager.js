import PropTypes from 'prop-types';

const account = PropTypes.shape({
  name: PropTypes.string,
  username: PropTypes.string,
  password: PropTypes.string,
});

const accounts = PropTypes.arrayOf(account);

const accountManager = PropTypes.shape({
  list: accounts,
  selectedAccount: account,
});

export default accountManager;
