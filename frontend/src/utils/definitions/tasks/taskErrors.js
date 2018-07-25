import PropTypes from 'prop-types';

const taskErrors = PropTypes.shape({
  sku: PropTypes.bool,
  profile: PropTypes.bool,
  status: PropTypes.bool,
  sizes: PropTypes.bool,
  pairs: PropTypes.bool,
});

export default taskErrors;
