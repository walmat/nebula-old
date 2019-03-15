import PropTypes from 'prop-types';

export const initialAwsCredentialsState = {
  AWSAccessKey: '',
  AWSSecretKey: '',
  accessToken: null,
  errors: {}, // TODO: Replace this with initialAwsCredentialsErrorState (when it gets defined)
};

const awsCredentials = PropTypes.shape({
  AWSAccessKey: PropTypes.string,
  AWSSecretKey: PropTypes.string,
  accessToken: PropTypes.string,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: define this!
});

export default awsCredentials;
