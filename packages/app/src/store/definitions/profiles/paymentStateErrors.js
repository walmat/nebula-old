import PropTypes from 'prop-types';

const paymentStateErrors = PropTypes.shape({
  email: PropTypes.bool,
  cardNumber: PropTypes.bool,
  exp: PropTypes.bool,
  cvv: PropTypes.bool,
});

export default paymentStateErrors;
