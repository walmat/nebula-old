import PropTypes from 'prop-types';

const locationState = PropTypes.shape({
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  address: PropTypes.string,
  apt: PropTypes.string,
  city: PropTypes.string,
  country: PropTypes.string,
  state: PropTypes.string,
  zipCode: PropTypes.string,
  phone: PropTypes.string,
  errors: PropTypes.shape({
    firstName: PropTypes.bool,
    lastName: PropTypes.bool,
    address: PropTypes.bool,
    apt: PropTypes.bool,
    city: PropTypes.bool,
    country: PropTypes.bool,
    state: PropTypes.bool,
    zipCode: PropTypes.bool,
    phone: PropTypes.bool,
  }),
});

export default locationState;
