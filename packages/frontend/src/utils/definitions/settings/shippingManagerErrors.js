import PropTypes from 'prop-types';

const shippingManagerErrors = PropTypes.shape({
  profile: PropTypes.bool,
  name: PropTypes.bool,
  site: PropTypes.bool,
  product: PropTypes.bool,
  username: PropTypes.bool,
  password: PropTypes.bool,
});

export default shippingManagerErrors;
