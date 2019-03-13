import PropTypes from 'prop-types';

import locationState from './locationState';
import paymentState from './paymentState';
import shippingRates from './rates';

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
