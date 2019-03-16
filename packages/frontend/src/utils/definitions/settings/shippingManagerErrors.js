import PropTypes from 'prop-types';

export const initialShippingManagerErrorState = {
  profile: null,
  name: null,
  site: null,
  product: null,
  username: null,
  password: null,
};

const shippingManagerErrors = PropTypes.shape({
  profile: PropTypes.bool,
  name: PropTypes.bool,
  site: PropTypes.bool,
  product: PropTypes.bool,
  username: PropTypes.bool,
  password: PropTypes.bool,
});

export default shippingManagerErrors;
