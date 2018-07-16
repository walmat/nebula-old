import PropTypes from 'prop-types';

import locationState from './locationState';
import paymentState from './paymentState';

const profile = PropTypes.shape({
  id: PropTypes.string,
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
