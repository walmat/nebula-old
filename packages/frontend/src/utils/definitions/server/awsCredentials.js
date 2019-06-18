import PropTypes from 'prop-types';

export const awsCredential = PropTypes.shape({
  loggedIn: PropTypes.bool,
  AWSAccessKey: PropTypes.string,
  AWSSecretKey: PropTypes.string,
});

export const credentials = PropTypes.arrayOf(awsCredential);

export default PropTypes.shape({
  selected: awsCredential,
  current: awsCredential,
  list: credentials,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: define this!
});
