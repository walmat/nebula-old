import PropTypes from 'prop-types';

export const awsCredentials = PropTypes.shape({
  loggedIn: PropTypes.bool,
  AWSAccessKey: PropTypes.string,
  AWSSecretKey: PropTypes.string,
});

export const credentials = PropTypes.arrayOf(awsCredentials);

export default PropTypes.shape({
  selected: awsCredentials,
  current: awsCredentials,
  list: credentials,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: define this!
});
