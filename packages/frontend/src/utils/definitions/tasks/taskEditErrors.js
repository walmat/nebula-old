import PropTypes from 'prop-types';

const taskEditErrors = PropTypes.shape({
  product: PropTypes.bool,
  sizes: PropTypes.bool,
  profile: PropTypes.bool,
  username: PropTypes.bool,
  password: PropTypes.bool,
  site: PropTypes.bool,
});

export default taskEditErrors;
