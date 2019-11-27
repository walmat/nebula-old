import PropTypes from 'prop-types';

const taskErrors = PropTypes.shape({
  product: PropTypes.bool,
  site: PropTypes.bool,
  profile: PropTypes.bool,
  sizes: PropTypes.bool,
  username: PropTypes.bool,
  password: PropTypes.bool,
});

export default taskErrors;
