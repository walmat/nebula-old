import PropTypes from 'prop-types';

import locationState from './locationState';
import paymentState from './paymentState';
import rates from './rates';

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
  rates,
  selectedSite: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
  }),
});

export default profile;
