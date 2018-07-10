import PropTypes from 'prop-types';

const awsCredentials = PropTypes.shape({
  AWSAccessKey: PropTypes.string,
  AWSSecretKey: PropTypes.string,
});

export default awsCredentials;
