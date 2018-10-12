import PropTypes from 'prop-types';

import locationState, { initialLocationState } from './locationState';
import paymentState, { initialPaymentState } from './paymentState';

export const initialProfileState = {
  id: null,
  profileName: '',
  errors: {
    profileName: null,
  },
  billingMatchesShipping: false,
  shipping: initialLocationState,
  billing: initialLocationState,
  payment: initialPaymentState,
};

const profile = PropTypes.shape({
  id: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  profileName: PropTypes.string,
  errors: PropTypes.shape({
    profileName: PropTypes.bool,
  }),
  billingMatchesShipping: PropTypes.bool,
  shipping: locationState,
  billing: locationState,
  payment: paymentState,
});

export default profile;
