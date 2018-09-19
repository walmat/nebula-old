import PropTypes from 'prop-types';

import paymentStateErrors, { initialPaymentErrorsState } from './paymentStateErrors';

export const initialPaymentState = {
  email: '',
  cardNumber: '',
  exp: '',
  cvv: '',
  errors: initialPaymentErrorsState,
};

const paymentState = PropTypes.shape({
  email: PropTypes.string,
  cardNumber: PropTypes.string,
  exp: PropTypes.string,
  cvv: PropTypes.string,
  errors: paymentStateErrors,
});

export default paymentState;
