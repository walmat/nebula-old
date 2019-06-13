import PropTypes from 'prop-types';
import { credential } from './credentials';

export default PropTypes.shape({
  id: PropTypes.String,
  proxy: PropTypes.String,
  region: PropTypes.String,
  speed: PropTypes.String,
  credentials: credential,
  status: PropTypes.String,
  charges: PropTypes.String,
});
