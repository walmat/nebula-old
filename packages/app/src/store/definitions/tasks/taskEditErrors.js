import PropTypes from 'prop-types';

const taskEditErrors = PropTypes.shape({
  product: PropTypes.bool,
  sizes: PropTypes.bool,
  profile: PropTypes.bool,
  account: PropTypes.bool,
  site: PropTypes.bool,
});

export default taskEditErrors;
