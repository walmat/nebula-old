import PropTypes from 'prop-types';
import { awsCredentials } from './awsCredentials';

export default PropTypes.shape({
  id: PropTypes.String,
  proxy: PropTypes.String,
  region: PropTypes.String,
  speed: PropTypes.String,
  credentials: awsCredentials,
  status: PropTypes.String,
  charges: PropTypes.String,
});
