import PropTypes from 'prop-types';

export const initialLocationErrorState = {
  firstName: null,
  lastName: null,
  address: null,
  apt: null,
  city: null,
  country: null,
  state: null,
  zipCode: null,
  phone: null,
};

const locationStateErrors = PropTypes.shape({
  firstName: PropTypes.bool,
  lastName: PropTypes.bool,
  address: PropTypes.bool,
  apt: PropTypes.bool,
  city: PropTypes.bool,
  country: PropTypes.bool,
  state: PropTypes.bool,
  zipCode: PropTypes.bool,
  phone: PropTypes.bool,
});

export default locationStateErrors;
