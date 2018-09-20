import PropTypes from 'prop-types';

export const initialAwsCredentialsState = {
  AWSAccessKey: '',
  AWSSecretKey: '',
  accessToken: null,
};

const awsCredentials = PropTypes.shape({
  AWSAccessKey: PropTypes.string,
  AWSSecretKey: PropTypes.string,
  accessToken: PropTypes.string,
});

export default awsCredentials;
