import PropTypes from 'prop-types';

export const credential = PropTypes.shape({
  loggedIn: PropTypes.bool,
  AWSAccessKey: PropTypes.string,
  AWSSecretKey: PropTypes.string,
});

export const credentials = PropTypes.arrayOf(credential);

export default PropTypes.shape({
  selected: credential,
  current: credential,
  list: credentials,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: define this!
});
