import PropTypes from 'prop-types';

const paymentState = PropTypes.shape({
  email: PropTypes.string,
  cardNumber: PropTypes.string,
  exp: PropTypes.string,
  cvv: PropTypes.string,
  errors: PropTypes.shape({
    email: PropTypes.bool,
    cardNumber: PropTypes.bool,
    exp: PropTypes.bool,
    cvv: PropTypes.bool,
  }),
});

export default paymentState;
