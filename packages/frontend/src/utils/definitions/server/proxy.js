import PropTypes from 'prop-types';
import { credential } from './credentials';

export default PropTypes.shape({
  status: PropTypes.String,
  ip: PropTypes.String,
  charges: PropTypes.String,
  credentials: credential,
});
