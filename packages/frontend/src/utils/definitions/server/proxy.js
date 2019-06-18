import PropTypes from 'prop-types';
import { awsCredential } from './awsCredentials';

export default PropTypes.shape({
  id: PropTypes.String,
  proxy: PropTypes.String,
  region: PropTypes.String,
  speed: PropTypes.String,
  awsCredential,
  status: PropTypes.String,
  charges: PropTypes.String,
});
