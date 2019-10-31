import PropTypes from 'prop-types';

import locationStateErrors from './locationStateErrors';

const locationState = PropTypes.shape({
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  address: PropTypes.string,
  apt: PropTypes.string,
  city: PropTypes.string,
  country: PropTypes.shape({
    value: PropTypes.string,
    label: PropTypes.string,
  }),
  province: PropTypes.shape({ value: PropTypes.string, label: PropTypes.string }),
  zipCode: PropTypes.string,
  phone: PropTypes.string,
  errors: locationStateErrors,
});

export default locationState;
