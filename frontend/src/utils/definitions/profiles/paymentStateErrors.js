import PropTypes from 'prop-types';

export const initialPaymentErrorsState = {
  email: null,
  cardNumber: null,
  exp: null,
  cvv: null,
};

const paymentStateErrors = PropTypes.shape({
  email: PropTypes.bool,
  cardNumber: PropTypes.bool,
  exp: PropTypes.bool,
  cvv: PropTypes.bool,
});

export default paymentStateErrors;
