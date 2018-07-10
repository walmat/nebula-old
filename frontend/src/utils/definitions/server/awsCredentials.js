import PropTypes from 'prop-types';

const awsCredentials = PropTypes.shape({
  AWSAccessKey: PropTypes.string,
  AWSSecretKey: PropTypes.string,
  accessToken: PropTypes.string,
});

export default awsCredentials;
