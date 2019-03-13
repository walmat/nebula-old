import PropTypes from 'prop-types';

import locationState, { initialLocationState } from './locationState';
import paymentState, { initialPaymentState } from './paymentState';
import shippingRates, { initialShippingRatesState } from './rates';

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
  rates: initialShippingRatesState,
  selectedSite: null,
  selectedRate: null,
};

const profile = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  profileName: PropTypes.string,
  errors: PropTypes.shape({
    profileName: PropTypes.bool,
  }),
  billingMatchesShipping: PropTypes.bool,
  shipping: locationState,
  billing: locationState,
  payment: paymentState,
  rates: shippingRates,
  selectedSite: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
  }),
  selectedRate: PropTypes.shape({
    name: PropTypes.string,
    rate: PropTypes.string,
  }),
});

export default profile;
