import PropTypes from 'prop-types';

import paymentStateErrors from './paymentStateErrors';

const paymentState = PropTypes.shape({
  email: PropTypes.string,
  cardNumber: PropTypes.string,
  exp: PropTypes.string,
  cvv: PropTypes.string,
  errors: paymentStateErrors,
});

export default paymentState;
