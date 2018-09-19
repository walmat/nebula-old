import PropTypes from 'prop-types';

import locationStateErrors, { initialLocationStateErrors } from './locationStateErrors';

export const initialLocationState = {
  firstName: '',
  lastName: '',
  address: '',
  apt: '',
  city: '',
  country: null,
  state: null,
  zipCode: '',
  phone: '',
  errors: initialLocationStateErrors,
};

const locationState = PropTypes.shape({
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  address: PropTypes.string,
  apt: PropTypes.string,
  city: PropTypes.string,
  country: PropTypes.shape({ value: PropTypes.string, label: PropTypes.string }),
  state: PropTypes.shape({ value: PropTypes.string, label: PropTypes.string }),
  zipCode: PropTypes.string,
  phone: PropTypes.string,
  errors: locationStateErrors,
});

export default locationState;
