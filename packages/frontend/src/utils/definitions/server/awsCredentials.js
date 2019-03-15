import PropTypes from 'prop-types';

const awsCredentials = PropTypes.shape({
  AWSAccessKey: PropTypes.string,
  AWSSecretKey: PropTypes.string,
  accessToken: PropTypes.string,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: define this!
});

export default awsCredentials;
